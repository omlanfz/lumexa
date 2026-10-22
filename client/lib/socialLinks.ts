// Lumexa's social profiles, shown under "Follow Us" in the site footer.
//
// TODO(owner): replace each `href` with the real Lumexa profile before launch,
// for example "https://www.facebook.com/<page>". They currently point at each
// network's home page so no link ever lands on an unrelated account.

export interface SocialLink {
  id: "facebook" | "youtube" | "instagram" | "linkedin";
  label: string;
  href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/" },
  { id: "youtube", label: "YouTube", href: "https://www.youtube.com/" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/" },
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/" },
];
