"use client";

import { useEffect } from "react";

const clientAuthTypes=new Set(["magiclink","invite"]);

export function ClientAuthFragmentBridge(){
  useEffect(()=>{
    if(location.pathname!=="/"||!location.hash)return;
    const fragment=new URLSearchParams(location.hash.slice(1));
    if(!fragment.has("access_token")||!clientAuthTypes.has(fragment.get("type")??""))return;
    location.replace(`/client/auth/callback${location.hash}`);
  },[]);
  return null;
}
