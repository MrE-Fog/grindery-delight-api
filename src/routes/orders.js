import express from 'express';
import { Database } from '../db/conn.js';
import isRequired from '../utils/auth-utils.js';
import {
  createOrderValidator,
  getOrderByIdValidator,
  setOrderCompleteValidator,
  getOrderByOrderIdValidator,
  deleteOrderValidator,
  getOrdersPaginationValidator,
  getOrdersLiquidityProviderValidator,
} from '../validators/orders.validator.js';
import { validateResult } from '../utils/validators-utils.js';
import { ObjectId } from 'mongodb';
import {
  ORDER_STATUS,
  getOneOrderWithOffer,
  getOrdersWithOffers,
} from '../utils/orders-utils.js';

const router = express.Router();

/* This is a POST request that creates a new order. */
router.post('/', createOrderValidator, isRequired, async (req, res) => {
  const validator = validateResult(req, res);
  if (validator.length) {
    return res.status(400).send(validator);
  }

  const db = await Database.getInstance(req);
  const collection = db.collection('orders');

  if (
    (await collection.findOne({
      orderId: req.body.orderId,
    })) &&
    req.body.orderId !== ''
  ) {
    res.status(404).send({
      msg: 'This order already exists.',
    });
  }

  let newDocument = req.body;
  newDocument.date = new Date();
  newDocument.userId = res.locals.userId;
  newDocument.isComplete = false;
  newDocument.status = ORDER_STATUS.PENDING;
  res.send(await collection.insertOne(newDocument)).status(201);
});

router.get(
  '/user',
  getOrdersPaginationValidator,
  isRequired,
  async (req, res) => {
    const db = await Database.getInstance(req);
    const query = { userId: { $regex: res.locals.userId, $options: 'i' } };

    res
      .send({
        orders: await getOrdersWithOffers(
          db,
          await db
            .collection('orders')
            .find(query)
            .sort({ date: -1 })
            .skip(+req.query.offset || 0)
            .limit(+req.query.limit || 0)
            .toArray()
        ),
        totalCount: await db.collection('orders').countDocuments(query),
      })
      .status(200);
  }
);

/* This is a GET request that returns a order for a specific user by the order id. */
router.get(
  '/orderId',
  getOrderByOrderIdValidator,
  isRequired,
  async (req, res) => {
    const validator = validateResult(req, res);
    if (validator.length) {
      return res.status(400).send(validator);
    }

    const db = await Database.getInstance(req);

    res
      .send(
        await getOneOrderWithOffer(
          db.collection('offers'),
          await db.collection('orders').findOne({
            userId: { $regex: res.locals.userId, $options: 'i' },
            orderId: req.query.orderId,
          })
        )
      )
      .status(200);
  }
);

/* This is a GET request that returns a order for a specific user by the order id. */
router.get('/id', getOrderByIdValidator, isRequired, async (req, res) => {
  const validator = validateResult(req, res);
  if (validator.length) {
    return res.status(400).send(validator);
  }

  const db = await Database.getInstance(req);

  res
    .send(
      await getOneOrderWithOffer(
        db.collection('offers'),
        await db.collection('orders').findOne({
          userId: { $regex: res.locals.userId, $options: 'i' },
          _id: new ObjectId(req.query.id),
        })
      )
    )
    .status(200);
});

/* This is a GET request that returns all orders associated with active offers for a specific user who
is a liquidity provider. */
router.get(
  '/liquidity-provider',
  getOrdersLiquidityProviderValidator,
  isRequired,
  async (req, res) => {
    const db = await Database.getInstance(req);

    const activeOffersForUser = await db
      .collection('offers')
      .find({
        userId: { $regex: res.locals.userId, $options: 'i' },
        ...(req.query.isActiveOffers
          ? JSON.parse(req.query.isActiveOffers)
            ? { isActive: true }
            : { isActive: false }
          : {}),
      })
      .toArray();

    const query = {
      offerId: { $in: activeOffersForUser.map((offer) => offer.offerId) },
    };

    res.status(200).send({
      orders: await getOrdersWithOffers(
        db,
        await db
          .collection('orders')
          .find(query)
          .sort({ date: -1 })
          .skip(+req.query.offset || 0)
          .limit(+req.query.limit || 0)
          .toArray()
      ),
      totalCount: await db.collection('orders').countDocuments(query),
    });
  }
);

/* This is a PUT request that adds a order to an offer. */
router.put(
  '/complete',
  setOrderCompleteValidator,
  isRequired,
  async (req, res) => {
    const validator = validateResult(req, res);
    if (validator.length) {
      return res.status(400).send(validator);
    }

    const db = await Database.getInstance(req);
    const collection = db.collection('orders');

    const order = await collection.findOne({
      orderId: req.body.orderId,
      userId: { $regex: res.locals.userId, $options: 'i' },
      status: ORDER_STATUS.SUCCESS,
    });

    if (!order) {
      return res.status(404).send({
        msg: 'No order found',
      });
    }

    res.status(200).send(
      await collection.updateOne(order, {
        $set: {
          status: ORDER_STATUS.COMPLETION,
          completionHash: req.body.completionHash,
        },
      })
    );
  }
);

router.delete(
  '/:orderId',
  deleteOrderValidator,
  isRequired,
  async (req, res) => {
    const validator = validateResult(req, res);
    const db = await Database.getInstance(req);
    const collection = db.collection('orders');

    if (validator.length) {
      return res.status(400).send(validator);
    }
    const order = await collection.findOne({
      orderId: req.params.orderId,
      userId: { $regex: res.locals.userId, $options: 'i' },
    });
    if (order) {
      res.status(200).send(await collection.deleteOne(order));
    } else {
      res.status(404).send({
        msg: 'No order found',
      });
    }
  }
);

export default router;
