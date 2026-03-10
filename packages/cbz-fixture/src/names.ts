import { type RNG, pick, shuffle } from "./random.js";

const FIRST_NAMES = [
  "Akira", "Yuki", "Kenji", "Hana", "Ren", "Sora", "Kaito", "Mei", "Ryu", "Aoi",
  "Haruki", "Natsuki", "Takeshi", "Sakura", "Daichi", "Yuna", "Shinji", "Ayaka",
  "James", "Emma", "Liam", "Olivia", "Noah", "Sophia", "Ethan", "Ava",
  "Carlos", "Sofia", "Miguel", "Luna", "Diego", "Camila", "Lucas", "Elena",
  "Wei", "Xiu", "Jin", "Ling", "Hao", "Yan", "Min", "Fei",
] as const;

const LAST_NAMES = [
  "Tanaka", "Suzuki", "Nakamura", "Yamamoto", "Watanabe", "Ito", "Kobayashi", "Kato",
  "Sato", "Yoshida", "Inoue", "Kimura", "Matsumoto", "Fujiwara", "Hayashi",
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Chen", "Wang", "Li", "Zhang", "Liu", "Yang",
  "Rodriguez", "Martinez", "Hernandez", "Kim", "Park", "Lee",
] as const;

const TITLE_WORDS_A = [
  "Shadow", "Burning", "Forgotten", "Eternal", "Silent", "Shattered", "Rising", "Fallen",
  "Dark", "Golden", "Iron", "Crystal", "Storm", "Crimson", "Lost", "Hidden",
  "Ancient", "Sacred", "Broken", "Hollow", "Wicked", "Distant", "Endless", "Blazing",
  "Cursed", "Fading", "Radiant", "Twisted", "Shining", "Frozen", "Wandering", "Shattered",
  "Celestial", "Phantom", "Emerald", "Scarlet", "Midnight", "Starless", "Blooming",
] as const;

const TITLE_WORDS_B = [
  "World", "Kingdom", "Tower", "Gate", "Star", "Dragon", "Blade", "Chronicle",
  "Heart", "Soul", "Spirit", "Legend", "Dream", "Path", "Horizon", "Echo",
  "Throne", "Labyrinth", "Wanderer", "Oracle", "Phantom", "Requiem", "Sanctuary",
  "Frontier", "Protocol", "Paradox", "Archive", "Covenant", "Uprising", "Heir",
  "Realm", "Codex", "Syndicate", "Descent", "Ascendant", "Vigil", "Tide",
] as const;

const TITLE_SUBTITLES = [
  "The Beginning", "A New Dawn", "Reckoning", "The Final Chapter", "Origins",
  "Aftermath", "Convergence", "The Lost Arc", "Awakening", "Shattered Bonds",
  "Into the Void", "Light and Shadow", "The Forgotten Path", "Revelation",
] as const;

export const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
  "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Thriller", "Supernatural",
] as const;

export const AGE_RATINGS = ["Everyone", "Teen", "Mature"] as const;

const PUBLISHERS = [
  "Viz Media", "Kodansha", "Shueisha", "Square Enix", "Dark Horse Comics",
  "Marvel", "DC Comics", "Image Comics", "Tokyopop", "Seven Seas Entertainment",
  "Yen Press", "Vertical Comics", "Oni Press", "BOOM! Studios",
] as const;

export function buildAuthorPool(rng: RNG, size: number): string[] {
  const firstNames = shuffle(rng, [...FIRST_NAMES]).slice(0, Math.min(size * 2, FIRST_NAMES.length));
  const lastNames = shuffle(rng, [...LAST_NAMES]).slice(0, Math.min(size * 2, LAST_NAMES.length));
  const pool: string[] = [];
  for (let i = 0; i < size; i++) {
    pool.push(`${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`);
  }
  return pool;
}

export function pickAuthors(rng: RNG, pool: string[]): string[] {
  const count = rng() < 0.8 ? 1 : 2;
  const shuffled = shuffle(rng, [...pool]);
  return shuffled.slice(0, Math.min(count, pool.length));
}

export function generateTitle(rng: RNG): string {
  const a = pick(rng, TITLE_WORDS_A);
  const b = pick(rng, TITLE_WORDS_B);
  return `${a} ${b}`;
}

export function generateSubtitle(rng: RNG): string {
  return pick(rng, TITLE_SUBTITLES);
}

export function pickPublisher(rng: RNG): string {
  return pick(rng, PUBLISHERS);
}

export function generateSummary(rng: RNG, title: string, authors: string[], genre: string): string {
  const templates = [
    `A gripping ${genre.toLowerCase()} story by ${authors[0]}.`,
    `${title} is an epic ${genre.toLowerCase()} saga that follows unlikely heroes on a journey across a world on the brink of collapse.`,
    `From ${authors[0]}, a stunning ${genre.toLowerCase()} tale of courage, betrayal, and redemption.`,
    `Set in a world where power and fate collide, ${title} explores the depths of the human spirit.`,
    `A breathtaking ${genre.toLowerCase()} adventure from the mind of ${authors[0]}.`,
  ];
  return pick(rng, templates);
}
