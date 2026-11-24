export type Locale = 'vi' | 'en';

export function selectLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'vi';
}

export type PublicCv = {
  template?: { html: string; css: string } | { document: string };
  locale: Locale;
  sample?: boolean;
  headings?: Partial<Record<'projects' | 'experience' | 'skills' | 'education' | 'certifications' | 'awards' | 'activities', string>>;
  extras?: { section: 'certifications' | 'awards' | 'activities'; items: { title: string; subtitle: string; details: string; start: string; end: string; url: string }[] }[];
  skillDetails?: { name: string; group: string; description: string }[];
  name: string;
  portrait?: string;
  role: string;
  intro: string;
  location: string;
  contact: { email: string; phone: string; website: string; github?: string; facebook?: string };
  seo: { title: string; description: string };
  experience: {
    role: string;
    organization: string;
    details: string[];
    start: string;
    end: string;
    contribution?: string;
    current?: boolean;
  }[];
  projects: { name: string; description: string; url?: string; github?: string; role?: string; contribution?: string; technologies?: string; start?: string; end?: string }[];
  education: Education | Education[];
  skills: string[];
};

type Education = { name: string; school: string; start?: string; end?: string; gpa?: string; details?: string };

export const labels = {
  vi: {
    sample: 'CV mẫu',
    skip: 'Đến nội dung chính',
    language: 'Ngôn ngữ',
    navigation: 'Mục lục',
    experience: 'Kinh nghiệm',
    projects: 'Dự án',
    skills: 'Kỹ năng',
    education: 'Học vấn',
    contact: 'Liên hệ',
    website: 'Trang web',
    footer: 'Thông tin minh họa',
    certifications: 'Chứng chỉ', awards: 'Giải thưởng', activities: 'Hoạt động', current: 'Hiện tại', demo: 'Demo', evidence: 'Minh chứng',
  },
  en: {
    sample: 'Sample CV',
    skip: 'Skip to main content',
    language: 'Language',
    navigation: 'Contents',
    experience: 'Experience',
    projects: 'Projects',
    skills: 'Skills',
    education: 'Education',
    contact: 'Contact',
    website: 'Website',
    footer: 'Fictitious profile',
    certifications: 'Certifications', awards: 'Awards', activities: 'Activities', current: 'Present', demo: 'Demo', evidence: 'Evidence',
  },
} as const;
