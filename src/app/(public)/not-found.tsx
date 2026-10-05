import { T } from "@/i18n/language-context";
import { ActionLink } from "@/components/ui/primitives";
export default function NotFound(){return <section className="container" style={{minHeight:"85svh",display:"grid",alignContent:"center",gap:"2rem",paddingTop:"8rem"}}><p className="eyebrow"><T id="notFound.404OutsideTheSystem"/></p><h1 className="display"><T id="notFound.thisPath"/><br/><T id="notFound.doesnTConnect"/></h1><div><ActionLink href="/" solid><T id="notFound.returnHome"/></ActionLink></div></section>}
