import { OG_SIZE } from "@/lib/og";
import { tokenImage } from "@/lib/tokenOg";

export const alt = "Elyport token check";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

type P = { params: Promise<{ address: string }> | { address: string } };

export default async function Image({ params }: P) {
  const { address } = await Promise.resolve(params);
  return tokenImage(address);
}
