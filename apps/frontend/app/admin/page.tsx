import type { Metadata } from 'next';
import { TemplateAdmin } from './template-admin';
import './admin.css';

export const metadata: Metadata = { title: 'Quản trị template CV', robots: { index: false, follow: false } };

export default function AdminPage() {
  return <TemplateAdmin />;
}
