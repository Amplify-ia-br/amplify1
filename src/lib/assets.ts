type AstroImageMetadata = {
  src: string;
};

export const assetSrc = (asset: string | AstroImageMetadata): string =>
  typeof asset === "string" ? asset : asset.src;
