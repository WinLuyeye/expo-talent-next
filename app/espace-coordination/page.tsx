import type {Metadata} from 'next';
import Dashboard from '@/components/Dashboard';
export const metadata:Metadata={title:'Espace Coordination — EXPO TALENT',robots:{index:false,follow:false}};
export default function CoordinationPage(){return <Dashboard/>}
