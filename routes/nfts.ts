import { PrismaClient } from '@prisma/client'
import express, { Request, Response } from 'express'
import {
  selectionUser,
  selectionCollection,
  selectionNFT,
  selectionReview,
} from '../constants/selections'
import {
  nftArraysInitializer,
  nftSaleLeaseAuctionInitializer,
} from '../constants/initializers'
import {
  nftPostValidationRules,
  nftPutSaleValidationRules,
  checkForErrors,
  isUrlValid,
} from '../functions/validations'
import nftTransferInitializer from '../functions/nftTransferInitializer'
import decodeTokenIds from '../functions/decodeTokenIds'

const prisma = new PrismaClient()
const router = express.Router()

/* Create one NFT */
router.post(
  '/',
  nftPostValidationRules,
  checkForErrors,
  async (req: Request, res: Response) => {
    const {
      address,
      name,
      blockchainType,
      // fileUrl --> image
      // multimediaFileUrl --> animationUrl
      image,
      animationUrl,
      tokenId,
      itemId,
      collection,
      ercType,
    } = req.body
    try {
      const imageValidity = image === '' || isUrlValid(image) ? true : false
      const animationUrlValidity =
        animationUrl === null || isUrlValid(animationUrl) ? true : false
      if (!imageValidity) throw { error: 'Invalid image' }
      if (!animationUrlValidity) throw { error: 'Invalid animationUrlValidity' }
      const data = {
        // fileUrl --> image
        // multimediaFileUrl --> animationUrl
        animationUrl,
        name,
        blockchainType,
        image,
        tokenId: parseInt(tokenId),
        itemId: parseInt(itemId),
        ercType,
        ...nftArraysInitializer,
      }
      const nft = await prisma.nFT.create({
        data: {
          ...data,
          user: { connect: { address } },
          creator: { connect: { address } },
          collection: { connect: { name: collection } },
        },
      })
      return res.json(nft)
    } catch (error) {
      console.log(error)
      return res
        .status(400)
        .json({ error: `Error while creating the token ${tokenId}` })
    }
  },
)

/* Create multiple NFTs */
router.post(
  '/multiple',
  nftPostValidationRules,
  checkForErrors,
  async (req: Request, res: Response) => {
    const {
      address,
      names,
      blockchainType,
      // fileUrls --> images
      // multimediaFileUrls --> animationUrls
      images,
      animationUrls,
      tokenIds,
      itemIds,
      collection,
      ercType,
    } = req.body
    try {
      const namesLength = names.length
      if (
        namesLength !== images.length ||
        namesLength !== animationUrls.length ||
        namesLength !== tokenIds.length ||
        namesLength !== itemIds.length
      ) {
        throw { error: 'The length of the given values are different' }
      }
      let imagesValidity = true
      let animationUrlsValidity = true
      for (let i = 0; i < namesLength; i++) {
        const image = images[i]
        const animationUrl = animationUrls[i]
        imagesValidity = image === '' || isUrlValid(image) ? true : false
        animationUrlsValidity =
          animationUrl === null || isUrlValid(animationUrl) ? true : false
      }
      if (!imagesValidity) throw { error: 'Invalid images' }
      if (!animationUrlsValidity) throw { error: 'Invalid animationUrls' }
      const nfts: any = []
      for (let i = 0; i < namesLength; i++) {
        const animationUrl = animationUrls[i]
        const image = images[i]
        const name = names[i]
        const tokenId = tokenIds[i]
        const itemId = itemIds[i]
        const data = {
          // fileUrl --> image
          // multimediaFileUrl --> animationUrl
          animationUrl,
          name,
          blockchainType,
          image,
          tokenId: parseInt(tokenId),
          itemId: parseInt(itemId),
          ercType,
          ...nftArraysInitializer,
        }
        const nft = await prisma.nFT.create({
          data: {
            ...data,
            user: { connect: { address } },
            creator: { connect: { address } },
            collection: { connect: { name: collection } },
          },
        })
        nfts.push(nft)
      }
      return res.json(nfts)
    } catch (error) {
      console.log(error)
      return res.status(400).json({ error: `Error while creating the tokens` })
    }
  },
)

/* Puts the NFT on market */
router.put(
  '/on-market/:tokenId',
  checkForErrors,
  async (req: Request, res: Response) => {
    let tokenId: string | number = req.params.tokenId
    tokenId = parseInt(tokenId)
    const {
      // data
      price,
      isOnSale,
      isOnLease,
      isOnAuction,
      startSaleDate,
      endSaleDate,
      // metadata
      saleType,
      collectibleCategory,
      productKeyAccessTokenCategory,
      productKeyVirtualAssetCategory,
      isSensitiveContent,
      descriptions,
      // newly added fields
      images,
      externalUrl,
      youtubeUrl,
      description,
      attributes,
      //
    } = req.body
    try {
      let imagesValidity = true
      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        imagesValidity = image === '' || isUrlValid(image) ? true : false
      }
      const externalUrlValidity =
        externalUrl === '' || isUrlValid(externalUrl) ? true : false
      const youtubeUrlValidity =
        youtubeUrl === '' || isUrlValid(youtubeUrl) ? true : false
      if (!imagesValidity) throw { error: 'Invalid images' }
      if (!externalUrlValidity) throw { error: 'Invalid externalUrl' }
      if (!youtubeUrlValidity) throw { error: 'Invalid youtubeUrl' }
      let nft = await prisma.nFT.findUnique({
        where: { tokenId },
      })
      let data = {
        price: parseInt(price),
        isOnSale,
        isOnLease,
        isOnAuction,
        startSaleDate,
        endSaleDate,
      }

      if (!nft?.isMetadataFrozen) {
        const metadata = {
          saleType,
          collectibleCategory,
          productKeyAccessTokenCategory,
          productKeyVirtualAssetCategory,
          isSensitiveContent,
          descriptions,
          // newly added fields
          images,
          externalUrl,
          youtubeUrl,
          description,
          attributes,
          //
        }
        data = { ...data, ...metadata }
      }
      let modifiedNft = await prisma.nFT.update({
        where: { tokenId },
        data: data,
      })
      res.json(modifiedNft)
    } catch (error) {
      console.log(error)
      return res
        .status(400)
        .json({ error: `Error while putting token ${tokenId} on sale` })
    }
  },
)

/* Puts the NFT off market */
router.put(
  '/off-market/:tokenId',
  checkForErrors,
  async (req: Request, res: Response) => {
    let tokenId: string | number = req.params.tokenId
    tokenId = parseInt(tokenId)
    try {
      const data = nftSaleLeaseAuctionInitializer
      let nft = await prisma.nFT.update({
        where: { tokenId },
        data: data,
      })
      res.json(nft)
    } catch (error) {
      console.log(error)
      return res
        .status(500)
        .json({ error: `Error while putting token ${tokenId} off sale` })
    }
  },
)

/* Edits the data of the NFT */
router.put(
  '/edit/:tokenId',
  checkForErrors,
  async (req: Request, res: Response) => {
    let tokenId: string | number = req.params.tokenId
    tokenId = parseInt(tokenId)
    const {
      name,
      // fileUrl --> image
      // multimediaFileUrl --> animationUrl
      image,
      animationUrl,
      isMetadataFrozen,
      collection,
      saleType,
      collectibleCategory,
      productKeyAccessTokenCategory,
      productKeyVirtualAssetCategory,
      isSensitiveContent,
      descriptions,
      // newly added fields
      images,
      externalUrl,
      youtubeUrl,
      description,
      attributes,
      //
    } = req.body
    try {
      const imageValidity = image === '' || isUrlValid(image) ? true : false
      const animationUrlValidity =
        animationUrl === null || isUrlValid(animationUrl) ? true : false
      let imagesValidity = true
      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        imagesValidity = image === '' || isUrlValid(image) ? true : false
      }
      const externalUrlValidity =
        externalUrl === '' || isUrlValid(externalUrl) ? true : false
      const youtubeUrlValidity =
        youtubeUrl === '' || isUrlValid(youtubeUrl) ? true : false
      if (!imageValidity) throw { error: 'Invalid image' }
      if (!animationUrlValidity) throw { error: 'Invalid animationUrl' }
      if (!imagesValidity) throw { error: 'Invalid images' }
      if (!externalUrlValidity) throw { error: 'Invalid externalUrl' }
      if (!youtubeUrlValidity) throw { error: 'Invalid youtubeUrl' }
      let nft = await prisma.nFT.findUnique({
        where: { tokenId },
        select: {
          ...selectionNFT,
          user: {
            select: {
              ...selectionUser,
            },
          },
          creator: {
            select: {
              ...selectionUser,
            },
          },
          collection: {
            select: {
              ...selectionCollection,
            },
          },
        },
      })
      let exisitingCollection = await prisma.collection.findUnique({
        where: { name: collection },
      })
      if (!exisitingCollection)
        throw { error: `Collection with name ${collection} does not exist` }
      if (!nft) throw { error: `NFT with tokenId ${tokenId} does not exist` }
      if (nft?.isMetadataFrozen)
        throw { error: `NFT with tokenId ${tokenId} has its metadata frozen` }

      // delete the old NFT
      await prisma.nFT.delete({ where: { tokenId } })

      // create a new NFT with modified data
      const data = {
        name,
        // fileUrl --> image
        // multimediaFileUrl --> animationUrl
        image,
        animationUrl,
        isMetadataFrozen,
        collection,
        saleType,
        collectibleCategory,
        productKeyAccessTokenCategory,
        productKeyVirtualAssetCategory,
        isSensitiveContent,
        descriptions,
        // newly added fields
        images,
        externalUrl,
        youtubeUrl,
        description,
        attributes,
        //
        blockchainType: nft.blockchainType,
        tokenId: nft.tokenId,
        itemId: nft.itemId,
        ercType: nft.ercType,
      }
      const newNft = await prisma.nFT.create({
        data: {
          ...data,
          user: { connect: { address: nft.user.address } },
          creator: { connect: { address: nft.creator.address } },
          collection: { connect: { name: collection } },
        },
      })

      res.json(newNft)
    } catch (error) {
      console.log(error)
      return res
        .status(400)
        .json({ error: `Error while updating the token ${tokenId}` })
    }
  },
)

/* changes the address of the NFT */
router.put(
  '/transfer/:tokenId',
  nftPutSaleValidationRules,
  checkForErrors,
  async (req: Request, res: Response) => {
    let tokenId: string | number = req.params.tokenId
    tokenId = parseInt(tokenId)
    const { address } = req.body
    try {
      let nft = await prisma.nFT.findUnique({
        where: { tokenId },
        select: {
          ...selectionNFT,
          user: {
            select: {
              ...selectionUser,
            },
          },
          creator: {
            select: {
              ...selectionUser,
            },
          },
          collection: {
            select: {
              ...selectionCollection,
            },
          },
        },
      })
      if (!nft) throw { error: `NFT with tokenId ${tokenId} does not exist` }

      // delete the old NFT
      await prisma.nFT.delete({ where: { tokenId } })

      // create a new NFT with modified data
      let data = nftTransferInitializer(nft)
      data = { ...data, ...nftSaleLeaseAuctionInitializer }
      const newNft = await prisma.nFT.create({
        data: {
          ...data,
          user: { connect: { address } },
          creator: { connect: { address: nft.creator.address } },
          collection: { connect: { name: nft.collection.name } },
        },
      })

      res.json(newNft)
    } catch (error) {
      console.log(error)
      return res
        .status(400)
        .json({ error: `Error while updating the token ${tokenId}` })
    }
  },
)

/* Deletes the NFT */
router.delete(
  '/:tokenId',
  checkForErrors,
  async (req: Request, res: Response) => {
    let tokenId: string | number = req.params.tokenId
    tokenId = parseInt(tokenId)
    try {
      await prisma.nFT.delete({
        where: { tokenId },
      })
      return res.json({ message: `Deleted the NFT: ${tokenId}` })
    } catch (error) {
      console.log(error)
      return res.status(500).json({
        error: `Error in the server while deleting NFT: ${tokenId}`,
      })
    }
  },
)

/* Fetches all NFTs */
router.get('/', async (req: Request, res: Response) => {
  try {
    const nfts = await prisma.nFT.findMany({
      select: {
        ...selectionNFT,
        user: {
          select: {
            ...selectionUser,
          },
        },
        creator: {
          select: {
            ...selectionUser,
          },
        },
        collection: {
          select: {
            ...selectionCollection,
          },
        },
        reviews: {
          select: {
            ...selectionReview,
          },
        },
      },
    })
    res.json(nfts)
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: 'Error occurred while fetching NFTs' })
  }
})

/* Fetches multiple NFTs by tokenIds */
router.get(
  '/multiple/:tokenIdsEncoded',
  async (req: Request, res: Response) => {
    const tokenIdsEncoded: string = req.params.tokenIdsEncoded
    const tokenIds = decodeTokenIds(tokenIdsEncoded)

    try {
      const nfts = []
      for (const tokenId of tokenIds) {
        const nft = await prisma.nFT.findUnique({
          where: { tokenId },
          select: {
            ...selectionNFT,
            user: {
              select: {
                ...selectionUser,
              },
            },
            creator: {
              select: {
                ...selectionUser,
              },
            },
            collection: {
              select: {
                ...selectionCollection,
              },
            },
            reviews: {
              select: {
                ...selectionReview,
              },
            },
          },
        })
        nfts.push(nft)
      }
      res.json(nfts)
    } catch (error) {
      console.log(error)
      res.status(400).json({ error: `Error occurred while fetching the NFTs` })
    }
  },
)

/* Fetches one NFT by tokenId */
router.get('/:tokenId', async (req: Request, res: Response) => {
  let tokenId: string | number = req.params.tokenId
  tokenId = parseInt(tokenId)
  try {
    const nft = await prisma.nFT.findUnique({
      where: { tokenId },
      select: {
        ...selectionNFT,
        user: {
          select: {
            ...selectionUser,
          },
        },
        creator: {
          select: {
            ...selectionUser,
          },
        },
        collection: {
          select: {
            ...selectionCollection,
          },
        },
        reviews: {
          select: {
            ...selectionReview,
          },
        },
      },
    })
    res.json(nft)
  } catch (error) {
    console.log(error)
    res
      .status(400)
      .json({ error: `Error occurred while fetching NFT: ${tokenId}` })
  }
})

/* like functions starts */

/* Fetches an NFT's like counts */
router.get('/likes/:tokenId', async (req: Request, res: Response) => {
  let tokenId: string | number = req.params.tokenId
  tokenId = parseInt(tokenId)
  try {
    const nft = await prisma.nFT.findUnique({
      where: { tokenId },
      select: {
        likes: true,
      },
    })
    res.json(nft)
  } catch (error) {
    console.log(error)
    res
      .status(400)
      .json({ error: `Error occurred while fetching NFT: ${tokenId}` })
  }
})

router.put(
  '/likes/:tokenId',
  checkForErrors,
  async (req: Request, res: Response) => {
    let tokenId: string | number = req.params.tokenId
    tokenId = parseInt(tokenId)
    const { address } = req.body
    try {
      let nft = await prisma.nFT.findUnique({ where: { tokenId } })
      if (!nft) throw { error: `NFT with tokenId ${tokenId} does not exist` }
      let user = await prisma.user.findUnique({ where: { address } })
      if (!user) throw { error: `Cannot find the user: ${address}` }
      if (user.likedNfts.includes(tokenId))
        throw {
          error: `User has already liked the NFT with tokenId ${tokenId}`,
        }
      const dataNft = {
        likes: nft.likes + 1,
      }
      const dataUser = {
        likedNfts: [...user.likedNfts, tokenId],
      }
      nft = await prisma.nFT.update({
        where: { tokenId },
        data: dataNft,
      })
      user = await prisma.user.update({
        where: { address },
        data: dataUser,
      })
      res.json([nft, user])
    } catch (error) {
      console.log(error)
      res
        .status(400)
        .json({ error: `Error occurred while editing an NFT: ${tokenId}` })
    }
  },
)

router.put(
  '/unlikes/:tokenId',
  checkForErrors,
  async (req: Request, res: Response) => {
    let tokenId: string | number = req.params.tokenId
    tokenId = parseInt(tokenId)
    const { address } = req.body
    try {
      let nft = await prisma.nFT.findUnique({ where: { tokenId } })
      if (!nft) throw { error: `NFT with tokenId ${tokenId} does not exist` }
      if (nft.likes <= 0)
        throw { error: `NFT with tokenId ${tokenId} has 0 or less likes` }
      let user = await prisma.user.findUnique({ where: { address } })
      if (!user) throw { error: `Cannot find the user: ${address}` }
      if (!user.likedNfts.includes(tokenId))
        throw { error: `tokenId not part of user's liked NFTs` }
      const dataNft = {
        likes: nft.likes - 1,
      }
      const newUserLikedNfts = user.likedNfts.filter(
        (nftTokenId) => nftTokenId !== tokenId,
      )
      const dataUser = {
        likedNfts: newUserLikedNfts,
      }
      nft = await prisma.nFT.update({
        where: { tokenId },
        data: dataNft,
      })
      user = await prisma.user.update({
        where: { address },
        data: dataUser,
      })
      res.json([nft, user])
    } catch (error) {
      console.log(error)
      res
        .status(400)
        .json({ error: `Error occurred while editing an NFT: ${tokenId}` })
    }
  },
)

/* like functions ends */

export default router
