import type {Metadata} from 'next';
import './globals.css';
import './admin-ui.css';
export const metadata: Metadata={title:'EXPO TALENT — ISS-KIN',description:'Révèle ton talent à l’Institut Supérieur de Statistique de Kinshasa.',icons:{icon:'/static/logo.webp'},openGraph:{title:'EXPO TALENT — ISS-KIN',description:'Révélons aujourd’hui les talents qui façonneront demain !',images:['/static/affiche.webp'],locale:'fr_CD',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
