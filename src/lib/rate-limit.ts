type Entry={count:number;resetAt:number};
const buckets=new Map<string,Entry>();
const MAX_BUCKETS=5000;
export function rateLimit(key:string,limit:number,windowMs:number){const now=Date.now();if(buckets.size>=MAX_BUCKETS)for(const [bucket,entry] of buckets)if(entry.resetAt<=now)buckets.delete(bucket);const current=buckets.get(key);if(!current||current.resetAt<=now){buckets.set(key,{count:1,resetAt:now+windowMs});return true}if(current.count>=limit)return false;current.count+=1;return true}
