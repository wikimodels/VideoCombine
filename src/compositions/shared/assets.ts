export const getAssetUrl = (filename: string) => {
    try {
        // We look in the root src/assets folder
        const asset = require(`../../assets/${filename}`);
        return typeof asset === 'string' ? asset : asset.default;
    } catch (e) {
        console.warn(`Asset ${filename} not found in shared assets.`);
        return null;
    }
};
