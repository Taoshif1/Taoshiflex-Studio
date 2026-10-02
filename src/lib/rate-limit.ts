type Entry={count:number;resetAt:number};
const buckets=new Map<string,Entry>();
const MAX_BUCKETS=5000;
export function rateLimit(key:string,limit:number,windowMs:number){if(key.length>256||!Number.isInteger(limit)||limit<1||!Number.isFinite(windowMs)||windowMs<1)return false;const now=Date.now();if(buckets.size>=MAX_BUCKETS)for(const [bucket,entry] of buckets)if(entry.resetAt<=now)buckets.delete(bucket);const current=buckets.get(key);if(!current||current.resetAt<=now){if(buckets.size>=MAX_BUCKETS&&!buckets.has(key))return false;buckets.set(key,{count:1,resetAt:now+windowMs});return true}if(current.count>=limit)return false;current.count+=1;return true}
