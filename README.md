# Pub Club Website

A modern, responsive website for **Pub Club**, an app for discovering pubs in London. Built with Next.js 15, TypeScript, and TailwindCSS.

## Features

### 🏠 Landing Page
- Hero section with compelling copy and download CTAs
- Feature highlights showcasing app capabilities
- Mobile-first responsive design
- Clear call-to-action buttons for app downloads

### 📝 Blog System
- Grid layout for blog posts
- Sample content about pubs, events, and London nightlife
- Tag system for categorization
- Newsletter signup section
- Easy to add new posts (just update the data file)

### 🔍 Pub Search & Directory
- Advanced search functionality
- Filter by location, pub type, and features
- Clean card-based layout for results
- Sample data with 12 London pubs
- Responsive grid layout

### 📱 Download Page
- Detailed app features showcase
- iOS and Android download sections
- System requirements
- Alternative web browsing option

### 🎨 Design & UX
- Modern, clean design with amber/brown color scheme
- Fully responsive (mobile-first)
- Accessible navigation and focus states
- Smooth transitions and hover effects
- Professional typography and spacing

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **Icons**: Heroicons (SVG)
- **Fonts**: Geist Sans (Google Fonts)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pub-club-website
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── blog/              # Blog page
│   ├── download/          # Download page
│   ├── pubs/              # Pub search page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── Navigation.tsx     # Site navigation
│   └── Footer.tsx         # Site footer
└── data/                  # Static data
    ├── blogPosts.ts       # Blog post data
    └── pubData.ts         # Pub directory data
```

## Customization

### Adding New Blog Posts
Edit `src/data/blogPosts.ts` and add new entries to the `blogPosts` array:

```typescript
{
  id: 7,
  title: "Your New Blog Post",
  excerpt: "Brief description...",
  content: "Full content...",
  author: "Author Name",
  date: "December 20, 2024",
  slug: "your-new-post",
  tags: ["Tag1", "Tag2"]
}
```

### Adding New Pubs
Edit `src/data/pubData.ts` and add new entries to the `pubData` array:

```typescript
{
  id: 13,
  name: "New Pub Name",
  description: "Pub description...",
  area: "Area Name",
  type: "Pub Type",
  features: ["Feature1", "Feature2"],
  rating: 4.5,
  reviewCount: 100,
  address: "Full address",
  phone: "+44 20 1234 5678",
  openingHours: "Mon-Sun: 11:00-23:00"
}
```

### Styling
The project uses TailwindCSS with a custom amber/brown color scheme. Main colors:
- Primary: `amber-600` (#d97706)
- Secondary: `amber-900` (#78350f)
- Accent: `amber-100` (#fef3c7)

## Deployment

The project is ready for deployment on Vercel, Netlify, or any other Next.js-compatible hosting platform.

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically

### Manual Build
```bash
npm run build
npm run start
```

## Future Enhancements

- [ ] Real database integration for pubs and blog posts
- [ ] User authentication and favorites system
- [ ] Interactive maps integration
- [ ] Pub reviews and ratings system
- [ ] Admin panel for content management
- [ ] SEO optimization and meta tags
- [ ] Image optimization and CDN
- [ ] Analytics integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Contact

For questions or support, contact: hello@pubclub.co.uk
