import { site } from "@/content/site";
export function BreadcrumbData({items}:{items:{name:string;path:string}[]}) {
  const data = {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{name:"Home",path:"/"},...items].map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,item:new URL(item.path,site.url).href}))};
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}}/>;
}
