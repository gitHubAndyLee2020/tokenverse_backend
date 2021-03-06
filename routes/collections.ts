import { PrismaClient } from '@prisma/client'
import express, { Request, Response } from 'express'
import {
  selectionUser,
  selectionCollection,
  selectionNFT,
  selectionReview,
} from '../constants/selections'
import { isUrlValid, checkForErrors } from '../functions/validations'
import emptyAddress from '../constants/emptyAddress'

const prisma = new PrismaClient()
const router = express.Router()

/* Creates a collection */
router.post(
  '/:address',
  checkForErrors,
  async (req: Request, res: Response) => {
    const address = req.params.address
    try {
      if (address === emptyAddress) throw { error: 'user address is empty' }

      const lastId = await prisma.collection.findMany({
        orderBy: { id: 'desc' },
        take: 1,
        select: {
          id: true,
        },
      })
      const collectionId = lastId[0] ? lastId[0].id + 1 : 1

      // For Testing
      console.log('collectionId: ', collectionId)

      let name = `collection-${collectionId}`
      // checks if there exists a collection
      let collection = await prisma.collection.findUnique({
        where: { name },
      })
      // creates the collection with the name `collection-${lastId}`
      console.log('address: ', address)
      if (!collection) {
        collection = await prisma.collection.create({
          data: {
            name,
            user: { connect: { address } },
          },
        })
      }
      return res.json(collection)
    } catch (error) {
      console.log(error)
      return res.status(500).json({
        error:
          'Error in the server while searching for the last id of the collections',
      })
    }
  },
)

/* Fetches a collection */
router.get('/:name', async (req: Request, res: Response) => {
  const name = req.params.name
  try {
    const collection = await prisma.collection.findUnique({
      where: { name },
      select: {
        ...selectionCollection,
        user: {
          select: {
            ...selectionUser,
          },
        },
        nfts: {
          select: {
            ...selectionNFT,
            reviews: {
              select: {
                ...selectionReview,
              },
            },
          },
        },
      },
    })
    return res.json(collection)
  } catch (error) {
    console.log(error)
    return res
      .status(400)
      .json({ error: `No collection with the name ${name} is found` })
  }
})

/* Modifies the name / image / description of a collection */
router.put(
  '/change-info/:name',
  checkForErrors,
  async (req: Request, res: Response) => {
    const name = req.params.name
    const { newName, image, description, isSameName } = req.body
    const imageTypeChecked = image
    try {
      const imageValidity =
        imageTypeChecked === null || isUrlValid(imageTypeChecked) ? true : false
      console.log('imageTypeChecked: ', imageTypeChecked)
      console.log('imageValidity: ', imageValidity)
      if (!imageValidity) throw { error: 'Invalid image url' }
      let collection = await prisma.collection.findUnique({ where: { name } })
      if (!collection) throw { error: `Cannot find the collection: ${name}` }
      if (!isSameName) {
        let existingNewNamedCollection = await prisma.collection.findUnique({
          where: { name: newName },
        })
        if (existingNewNamedCollection)
          throw { error: `Collection with the name ${newName} already exists` }
      }
      const data = {
        name: newName,
        description,
        image: imageTypeChecked,
        isNameModified: true,
      }
      collection = await prisma.collection.update({
        where: { name },
        data: data,
      })
      return res.json(collection)
    } catch (error) {
      console.log(error)
      return res
        .status(400)
        .json({ error: `Error on updating collection: ${name}` })
    }
  },
)

/* Deletes a collection */
router.delete('/:name', checkForErrors, async (req: Request, res: Response) => {
  const name = req.params.name
  try {
    let collection = await prisma.collection.findUnique({
      where: { name },
      select: {
        nfts: {
          select: {
            tokenId: true,
          },
        },
      },
    })
    if (!collection) throw { error: `Collection ${name} does not exists` }
    if (collection?.nfts.length > 0)
      throw {
        error: `Collection ${name} contains one or more NFTs, the collection must be empty in order it to be deleted`,
      }
    await prisma.collection.delete({
      where: { name },
    })
    return res.json({ message: `Deleted the collection: ${name}` })
  } catch (error) {
    console.log(error)
    return res
      .status(500)
      .json({ error: `Error in the server while deleting collection: ${name}` })
  }
})

/* Fetches all the collections */
router.get('/', async (req: Request, res: Response) => {
  try {
    const collections = await prisma.collection.findMany({
      select: {
        ...selectionCollection,
        user: {
          select: {
            ...selectionUser,
          },
        },
        nfts: {
          select: {
            ...selectionNFT,
            reviews: {
              select: {
                ...selectionReview,
              },
            },
          },
        },
      },
    })
    return res.json(collections)
  } catch (error) {
    console.log(error)
    return res
      .status(400)
      .json({ error: 'Error occurred while fetching collections' })
  }
})

export default router
