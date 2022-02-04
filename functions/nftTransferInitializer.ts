const nftTransferInitializer = (
  nft: any,
  multimediaFileTypeChecked: string,
) => {
  const data = {
    name: nft.name,
    fileUrl: nft.fileUrl,
    multimediaFile: multimediaFileTypeChecked,
    isMetadataFrozen: nft.isMetadataFrozen,
    collection: nft.collection,
    saleType: nft.saleType,
    collectibleCategory: nft.collectibleCategory,
    productKeyRealLifeAssetCategory: nft.productKeyRealLifeAssetCategory,
    productKeyVirtualAssetCategory: nft.productKeyVirtualAssetCategory,
    isSensitiveContent: nft.isSensitiveContent,
    descriptions: nft.descriptions,
    propertiesKey: nft.propertiesKey,
    propertiesValue: nft.propertiesValue,
    imagesKey: nft.imagesKey,
    imagesValue: nft.imagesValue,
    levelsKey: nft.levelsKey,
    levelsValueNum: nft.levelsValueNum,
    levelsValueDen: nft.levelsValueDen,
    blockchainType: nft.blockchainType,
    tokenId: nft.tokenId,
    itemId: nft.itemId,
    ercType: nft.ercType,
  }
  return data
}

export default nftTransferInitializer