export const config = { runtime: "edge" };

export default function handler() {
  return Response.json(
    { error: "gone", replacement: "/lab/ana" },
    {
      status: 410,
      headers: {
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
      },
    },
  );
}
