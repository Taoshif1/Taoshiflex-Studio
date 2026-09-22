"use client";
import { useState } from "react";
import type { PublicReview } from "@/types/content";
import { ReviewCard } from "./review-card";
import "./review-marquee.css";

export function ReviewMarquee({ reviews }: {reviews:PublicReview[]}) {
  const [paused,setPaused]=useState(false);
  if(!reviews.length)return null;
  const items=reviews.slice(0,8);
  const moving=items.length>2;
  const rows=items.length>=4?[items.filter((_,i)=>i%2===0),items.filter((_,i)=>i%2===1)]:[items];
  return <section className={`home-reviews${paused?' is-paused':''}${moving?' is-moving':''}`} aria-labelledby="home-reviews-title"><header className="container"><div><p className="eyebrow">Client perspectives</p><h2 id="home-reviews-title">The experience,<br/>in their own words.</h2></div>{moving&&<button className="review-motion-control" onClick={()=>setPaused(value=>!value)} aria-pressed={paused}>{paused?'Resume motion':'Pause motion'}</button>}</header><div className="review-rows">{rows.map((row,index)=><div className="review-row" key={index}><div className="review-track"><div className="review-group">{row.map(review=><ReviewCard key={review.id} review={review}/>)}{moving&&row.length<4&&<div className="review-fill" aria-hidden="true" inert>{row.map(review=><ReviewCard key={review.id} review={review}/>)}</div>}</div>{moving&&<div className="review-group review-duplicates" aria-hidden="true" inert>{row.map(review=><ReviewCard key={review.id} review={review}/>)}{row.length<4&&row.map(review=><ReviewCard key={`fill-${review.id}`} review={review}/>)}</div>}</div></div>)}</div></section>;
}
