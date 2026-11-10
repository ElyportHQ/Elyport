import { OG_SIZE } from "@/lib/og";
import { lockImage } from "@/lib/lockOg";

export const alt = "Elyport lock";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

type P = { params: Promise<{ id: string }> | { id: string } };

export default async function Image({ params }: P) {
  const { id } = await Promise.resolve(params);
  return lockImage(id);
}
