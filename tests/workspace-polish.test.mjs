import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { smtpDiagnostic } from '../src/lib/smtp-diagnostics.ts';
import { selectHomepageReviews, canSubmitProjectReview } from '../src/lib/review-selection.ts';

test('SMTP provider diagnostics are allowlisted and never echo raw errors', () => {
  const cases = [['EAUTH','smtp_auth'],['EDNS','smtp_dns'],['ENOTFOUND','smtp_dns'],['EAI_AGAIN','smtp_dns'],['ECONNREFUSED','smtp_refused'],['ETIMEDOUT','smtp_timeout'],['ETLS','smtp_tls'],['ERR_TLS_CERT_ALTNAME_INVALID','smtp_tls'],['CERT_HAS_EXPIRED','smtp_tls'],['arbitrary credential value','smtp_delivery_failed']];
  for (const [code, expected] of cases) {
    const diagnostic = smtpDiagnostic({ code, message:'SECRET password auth response', response:'SECRET', password:'SECRET' });
    assert.equal(diagnostic.code, expected);
    assert.doesNotMatch(JSON.stringify(diagnostic), /SECRET|arbitrary credential/);
  }
  assert.equal(smtpDiagnostic({code:'ESOCKET',cause:{code:'ECONNREFUSED'}}).code,'smtp_refused');
  assert.equal(smtpDiagnostic({code:'EENVELOPE',command:'RCPT TO'}).code,'smtp_recipient');
  assert.equal(smtpDiagnostic({code:'EENVELOPE',command:'MAIL FROM'}).code,'smtp_delivery_failed');
  for (const error of [null, undefined, 'SECRET', {}, { code: 'toString' }]) assert.equal(smtpDiagnostic(error).code, 'smtp_delivery_failed');
});

test('only completed Client members are eligible in the review interface', () => {
  assert.equal(canSubmitProjectReview('client','completed'),true);
  for (const role of ['viewer','admin',undefined]) assert.equal(canSubmitProjectReview(role,'completed'),false);
  for (const status of ['planning','active','on_hold','cancelled']) assert.equal(canSubmitProjectReview('client',status),false);
});

test('published homepage selection pins editorial reviews then ranks rating with stable order and cap', () => {
  const reviews = [
    {id:'configured-first',featured:false,rating:5},
    {id:'low',featured:false,rating:3},
    {id:'configured-second',featured:false,rating:5},
    {id:'pin',featured:true,rating:4},
  ];
  assert.deepEqual(selectHomepageReviews(reviews).map(r=>r.id),['pin','configured-first','configured-second','low']);
  assert.deepEqual(reviews.map(r=>r.id),['configured-first','low','configured-second','pin']);
  assert.equal(selectHomepageReviews(Array.from({length:12},(_,id)=>({id,featured:false,rating:5}))).length,8);
  assert.deepEqual(selectHomepageReviews([]),[]);
});

test('highest published reviews still appear with no featured reviews or public project mapping', () => {
  const rows=[{id:'a',featured:false,rating:2,project_slug:null},{id:'b',featured:false,rating:5,project_slug:null}];
  assert.deepEqual(selectHomepageReviews(rows).map(r=>r.id),['b','a']);
  const source=readFileSync(new URL('../src/lib/studio-data.ts',import.meta.url),'utf8');
  assert.match(source,/published_project_reviews\?select=id,reviewer_name/);
  assert.match(source,/order=sort_order.asc,id.asc/);
  assert.match(source,/selectHomepageReviews\(await getPublishedReviews\(\)\)/);
  const query=source.split('published_project_reviews?')[1].split('"')[0];
  assert.doesNotMatch(query,/client_project_id|reviewer_user_id|moderation_note|email/);
});

test('homepage keeps revalidation and strict optimizer boundary', () => {
  const page=readFileSync(new URL('../src/app/(public)/page.tsx',import.meta.url),'utf8');
  assert.match(page,/revalidate = 60/); assert.doesNotMatch(page,/force-dynamic/);
  const config=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8');
  assert.match(config,/maximumRedirects: 0/); assert.match(config,/public\/project-media\/\*\*/);
});

test('Nodemailer socket wrapping still maps safe refusal and TLS messages', () => {
  for (const [message, code] of [['connect ECONNREFUSED secret-host:465','smtp_refused'], ['self-signed certificate SECRET','smtp_tls'], ['socket timed out SECRET','smtp_timeout']]) {
    const result=smtpDiagnostic({code:'ESOCKET',message,response:'SECRET AUTH'});
    assert.equal(result.code,code); assert.doesNotMatch(JSON.stringify(result),/SECRET|secret-host/);
  }
});

test('admin SMTP test endpoint returns only safe diagnostics after authorization', async () => {
  const { loadTs } = await import('./security-loader.mjs');
  const { POST } = loadTs('src/app/api/studio/inquiry-alerts/route.ts', {
    '@/lib/admin-security': { authorizeMutation: async () => ({}) },
    '@/lib/inquiry-alerts': { sendTestInquiryAlert: async () => { throw { code:'EAUTH',response:'SECRET',message:'SECRET' }; } },
  });
  const response=await POST(new Request('https://studio.example/api/studio/inquiry-alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel:'email'})}));
  assert.equal(response.status,503);
  const result=await response.json(); assert.equal(result.code,'smtp_auth'); assert.doesNotMatch(JSON.stringify(result),/SECRET/);
});
