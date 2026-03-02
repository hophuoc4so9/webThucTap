import {
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  ExternalLink,
} from "lucide-react";

export function SocialIcon({
  platform,
  size,
}: {
  platform: string;
  size: number;
}) {
  const p = platform.toLowerCase();
  if (p.includes("facebook")) return <Facebook size={size} />;
  if (p.includes("twitter") || p.includes("x.com"))
    return <Twitter size={size} />;
  if (p.includes("linkedin")) return <Linkedin size={size} />;
  if (p.includes("youtube")) return <Youtube size={size} />;
  return <ExternalLink size={size} />;
}
