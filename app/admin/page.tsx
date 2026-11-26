import type {Metadata} from 'next';
import Dashboard from '@/components/Dashboard';
export const metadata:Metadata={title:'Administration — EXPO TALENT',robots:{index:false,follow:false}};
export default function AdminPage(){return <Dashboard/>}
