export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  slug: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "The Best Traditional Pubs in London's Historic Districts",
    excerpt: "Discover the charm of London's oldest pubs, from the medieval alehouses of the City to the Victorian gin palaces of the East End.",
    content: "London's traditional pubs are more than just places to drink – they're living museums of British social history. From the medieval alehouses that served as community meeting places to the grand Victorian gin palaces that reflected the city's growing wealth, these establishments tell the story of London itself...",
    author: "Sarah Johnson",
    date: "December 15, 2024",
    slug: "best-traditional-pubs-london",
    tags: ["Traditional", "History", "City of London"]
  },
  {
    id: 2,
    title: "Craft Beer Revolution: London's Best Microbreweries and Taprooms",
    excerpt: "Explore the booming craft beer scene in London, from innovative microbreweries to dedicated taprooms serving the finest local brews.",
    content: "London's craft beer scene has exploded in recent years, with microbreweries and taprooms popping up across the capital. From Bermondsey's Beer Mile to Hackney's brewing hotspots, the city is now home to some of the most innovative brewers in the UK...",
    author: "Mike Chen",
    date: "December 12, 2024",
    slug: "craft-beer-revolution-london",
    tags: ["Craft Beer", "Microbreweries", "Modern"]
  },
  {
    id: 3,
    title: "Weekend Pub Crawl: The Ultimate Soho Experience",
    excerpt: "Plan the perfect pub crawl through Soho's legendary drinking establishments, from historic pubs to trendy cocktail bars.",
    content: "Soho has long been London's entertainment heart, and its pubs and bars reflect the area's vibrant, eclectic character. This weekend pub crawl takes you through some of the most iconic drinking spots in the capital...",
    author: "Emma Thompson",
    date: "December 10, 2024",
    slug: "soho-pub-crawl-weekend",
    tags: ["Pub Crawl", "Soho", "Weekend Guide"]
  },
  {
    id: 4,
    title: "Sports Bars in London: Where to Watch the Big Game",
    excerpt: "Find the best sports bars across London for watching football, rugby, cricket, and other major sporting events with fellow fans.",
    content: "Whether you're a die-hard football fan or just want to catch the latest rugby match, London has plenty of sports bars that offer the perfect atmosphere for watching the big game. From dedicated football pubs to multi-screen sports bars...",
    author: "David Wilson",
    date: "December 8, 2024",
    slug: "sports-bars-london-big-game",
    tags: ["Sports", "Football", "Rugby"]
  },
  {
    id: 5,
    title: "Rooftop Bars: London's Best High-Rise Drinking Spots",
    excerpt: "Elevate your drinking experience at London's most spectacular rooftop bars, offering stunning city views and premium cocktails.",
    content: "There's something magical about enjoying a drink with a view, and London's rooftop bars offer some of the most spectacular panoramas in the city. From the Shard's sky-high cocktail bars to hidden rooftop gardens...",
    author: "Lisa Park",
    date: "December 5, 2024",
    slug: "rooftop-bars-london-views",
    tags: ["Rooftop", "Cocktails", "Views"]
  },
  {
    id: 6,
    title: "Pub Food Revolution: London's Best Gastro Pubs",
    excerpt: "Discover pubs that serve exceptional food alongside great drinks, from traditional British fare to innovative modern cuisine.",
    content: "The days of soggy pub sandwiches are long gone. London's gastro pubs are leading a culinary revolution, serving everything from traditional Sunday roasts to innovative fusion dishes that rival the city's best restaurants...",
    author: "James Miller",
    date: "December 3, 2024",
    slug: "gastro-pubs-london-food",
    tags: ["Food", "Gastro Pubs", "Dining"]
  }
]; 