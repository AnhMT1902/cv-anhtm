import { BadRequestException } from '@nestjs/common';

export type Locale = 'vi' | 'en';

export function selectLocale(value: unknown): Locale {
  if (value === undefined || value === 'vi') return 'vi';
  if (value === 'en') return 'en';
  throw new BadRequestException('lang must be vi or en');
}

// Fictitious sample content for the local prototype.
const profile = {
  name: 'Nguyễn Minh An',
  email: 'minh-an@example.com',
  phone: '+12025550101',
  website: 'https://example.com/',
  experienceStart: '2022-08',
  experienceEnd: '2025-06',
  privateNote: 'Fixture field excluded from the public response',
};

const translations = {
  vi: {
    role: 'Lập trình viên phần mềm',
    intro: 'Tôi xây dựng ứng dụng web dễ sử dụng, từ giao diện đến những API đứng phía sau. Tôi thích biến các quy trình phức tạp thành những thao tác rõ ràng.',
    location: 'Thành phố Hồ Chí Minh, Việt Nam',
    seoTitle: 'Nguyễn Minh An | CV mẫu',
    experience: {
      role: 'Lập trình viên Full-stack',
      organization: 'Nhóm sản phẩm mẫu',
      details: [
        'Xây dựng giao diện tra cứu và quản lý nội dung trên Next.js.',
        'Thiết kế API cho quy trình biên tập và chuẩn hóa kiểm thử luồng chính.',
      ],
    },
    projects: [
      { name: 'Sổ tay dự án', description: 'Ứng dụng web giúp nhóm theo dõi quyết định thiết kế và công việc theo từng đợt.' },
      { name: 'Danh mục nội dung', description: 'Giao diện tìm kiếm và phân loại nội dung dành cho nhóm biên tập nhỏ.' },
    ],
    education: { name: 'Công nghệ thông tin', school: 'Chương trình đào tạo mẫu' },
  },
  en: {
    role: 'Software Developer',
    intro: 'I build accessible web applications, from the interface to the APIs behind it. I enjoy turning complex workflows into clear, practical steps.',
    location: 'Ho Chi Minh City, Vietnam',
    seoTitle: 'Nguyễn Minh An | Sample CV',
    experience: {
      role: 'Full-stack Developer',
      organization: 'Sample product team',
      details: [
        'Built search and content management interfaces with Next.js.',
        'Designed APIs for editorial workflows and standardized tests for core journeys.',
      ],
    },
    projects: [
      { name: 'Project Journal', description: 'A web application that helps teams track design decisions and work by milestone.' },
      { name: 'Content Catalog', description: 'A search and classification interface for small editorial teams.' },
    ],
    education: { name: 'Information Technology', school: 'Sample academic program' },
  },
};

export function publicCv(locale: Locale) {
  const content = translations[locale];

  return {
    locale,
    name: profile.name,
    role: content.role,
    intro: content.intro,
    location: content.location,
    contact: { email: profile.email, phone: profile.phone, website: profile.website },
    seo: { title: content.seoTitle, description: content.intro },
    experience: [{
      role: content.experience.role,
      organization: content.experience.organization,
      details: content.experience.details,
      start: profile.experienceStart,
      end: profile.experienceEnd,
    }],
    projects: content.projects,
    education: content.education,
    skills: ['TypeScript', 'Next.js', 'React', 'NestJS', 'REST API', 'Playwright'],
  };
}
