import { redirect } from "next/navigation";
import { getAdminSession,supabaseRest } from "@/lib/supabase-rest";
import { ProductsAdmin,type AdminProduct } from "./products-admin";
export default async function ProductsAdminPage(){
  if(!await getAdminSession())redirect('/studio-admin');
  const products=await supabaseRest<AdminProduct[]>('products?select=*,product_media(*)&order=sort_order.asc,created_at.desc',{},'privileged').catch(()=>null);
  return <div className="admin-shell"><header className="admin-head"><p className="eyebrow">Studio Console / Products</p><h1>Built by the Studio.</h1><p>Owned software and products. Public content is authored here; private source stays private.</p></header>{products===null?<p>Products are unavailable. Verify the Products migration is applied.</p>:<ProductsAdmin products={products}/>}</div>;
}
