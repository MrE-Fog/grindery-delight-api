import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../index.js';
import db from '../db/conn-test.js';
import {
  mockedToken,
  testNonString,
  testNonEmpty,
  testUnexpectedField,
  testNonCaipId,
  testNonURL,
  testNonBoolean,
  testNonMongodbId,
  deleteElementsAfterTest,
} from './utils.js';
import { ObjectId } from 'mongodb';

chai.use(chaiHttp);
const expect = chai.expect;

const collectionBlockchains = db.collection('blockchains');
const blockchainPath = '/test/blockchains';
const blockchain = {
  caipId: 'eip155:534',
  chainId: '534',
  icon: 'https://www.grindery.io/hubfs/delight-assets/icons/blockchains/eip155-534.png',
  isActive: true,
  isEvm: true,
  isTestnet: true,
  label: 'myTestnet',
  nativeTokenSymbol: 'myTokenSymbol',
  rpc: [
    'https://goerli.blockpi.network/v1/rpc/public',
    'https://rpc.ankr.com/eth_goerli',
    'https://eth-goerli.public.blastapi.io',
  ],
  transactionExplorerUrl: 'https://goerli.etherscan.io/tx/{hash}',
  addressExplorerUrl: 'https://goerli.etherscan.io/address/{hash}',
};
const usefulAddress = {
  contract: 'myContract1',
  address: 'myAddress1',
};
const toDeleteDb = [];

/**
 * This function modifies a specific field in a blockchain object and tests that the modification was
 * successful.
 */
function modifyBlockchainField({ field, value }) {
  it(`PUT /blockchains/blockchainId - ${field} - Should modify ${field}`, async function () {
    const customBlockchain = {
      ...blockchain,
      isActive: false,
      isEvm: false,
      isTestnet: false,
    };
    const createResponse = await createBaseBlockchain(customBlockchain);

    const res = await chai
      .request(app)
      .put(`/test/blockchains/${createResponse.body.insertedId}`)
      .set('Authorization', `Bearer ${mockedToken}`)
      .send({ [field]: value });
    chai.expect(res).to.have.status(200);
    chai.expect(res.body).to.deep.equal({
      acknowledged: true,
      modifiedCount: 1,
      upsertedId: null,
      upsertedCount: 0,
      matchedCount: 1,
    });
    const blockchainDB = await collectionBlockchains.findOne({
      _id: new ObjectId(createResponse.body.insertedId),
    });
    delete blockchainDB._id;
    chai
      .expect(blockchainDB)
      .to.deep.equal({ ...customBlockchain, [field]: value });
  });
}

/**
 * This function creates a new blockchain in a database using a POST request and expects a successful
 * response.
 * @param blockchain - The parameter `blockchain` is an object that represents the data of a blockchain
 * that will be created. It is being passed as an argument to the `createBaseBlockchain` function.
 */
async function createBaseBlockchain(blockchain) {
  const res = await chai
    .request(app)
    .post(blockchainPath)
    .set('Authorization', `Bearer ${mockedToken}`)
    .send(blockchain);
  toDeleteDb.push({
    collection: collectionBlockchains,
    id: res.body.insertedId,
  });
  chai.expect(res).to.have.status(200);
  chai.expect(res.body).to.have.property('acknowledged').that.is.true;
  chai.expect(res.body).to.have.property('insertedId').that.is.not.empty;
  return res;
}

afterEach(async function () {
  await deleteElementsAfterTest(toDeleteDb);
  toDeleteDb.length = 0;
});

describe('Blockchains route', async function () {
  describe('POST new blockchain', () => {
    describe('Core of the route', () => {
      it('Should return 403 if no token is provided', async function () {
        const createResponse = await chai
          .request(app)
          .post(blockchainPath)
          .send(blockchain);
        chai.expect(createResponse).to.have.status(403);
      });

      it('Should create a new blockchain', async function () {
        await createBaseBlockchain(blockchain);
      });
      it('Should create a new blockchain with the proper fields', async function () {
        const createResponse = await createBaseBlockchain(blockchain);

        const res = await chai
          .request(app)
          .get(`/test/blockchains/${createResponse.body.insertedId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(res).to.have.status(200);
        delete res.body._id;
        chai.expect(res.body).to.deep.equal(blockchain);
      });
      it('Should create a new blockchain with the proper fields', async function () {
        await createBaseBlockchain(blockchain);

        const createResponse1 = await chai
          .request(app)
          .post(blockchainPath)
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(blockchain);
        chai.expect(createResponse1).to.have.status(404);
        chai
          .expect(createResponse1.body)
          .to.deep.equal({ msg: 'This blockchain already exists.' });
      });
    });
    describe('Validators', () => {
      it('Should fail if rpc is not an array', async function () {
        // Make a request to create the offer with invalid data
        const res = await chai
          .request(app)
          .post(blockchainPath)
          .set({ Authorization: `Bearer ${mockedToken}` })
          .send({ ...blockchain, rpc: 'notAnArray' });
        // Assertions
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(
          res.body.some(
            (err) => err.msg === 'must be an array' && err.param === 'rpc'
          )
        ).to.be.true;
      });
      it('Should fail if rpc contains non-URL values', async function () {
        // Make a request to create the offer with invalid data
        const res = await chai
          .request(app)
          .post(blockchainPath)
          .set({ Authorization: `Bearer ${mockedToken}` })
          .send({ ...blockchain, rpc: ['notAnURL', 123] });
        // Assertions
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(
          res.body.some((err) => err.msg === 'must be an array of URL')
        ).to.be.true;
      });
      const testCases = [
        'chainId',
        'caipId',
        'label',
        'icon',
        'rpc',
        'nativeTokenSymbol',
        'transactionExplorerUrl',
        'addressExplorerUrl',
        'isEvm',
        'isTestnet',
        'isActive',
      ];
      for (const testCase of testCases) {
        if (testCase == 'caipId') {
          testNonCaipId({
            method: 'post',
            path: blockchainPath,
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (
          testCase == 'transactionExplorerUrl' ||
          testCase == 'addressExplorerUrl'
        ) {
          testNonURL({
            method: 'post',
            path: blockchainPath,
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (
          testCase == 'isEvm' ||
          testCase == 'isTestnet' ||
          testCase == 'isActive'
        ) {
          testNonBoolean({
            method: 'post',
            path: blockchainPath,
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (testCase !== 'rpc') {
          testNonString({
            method: 'post',
            path: blockchainPath,
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        }
        testNonEmpty({
          method: 'post',
          path: blockchainPath,
          body: {
            ...blockchain,
            [testCase]: '',
          },
          query: {},
          field: testCase,
        });
      }

      testUnexpectedField({
        method: 'post',
        path: blockchainPath,
        body: {
          ...blockchain,
          unexpectedField: 'unexpectedField',
        },
        query: {},
        field: 'unexpectedField',
        location: 'body',
      });

      testUnexpectedField({
        method: 'post',
        path: blockchainPath,
        body: {
          ...blockchain,
        },
        query: { unexpectedField: 'unexpectedField' },
        field: 'unexpectedField',
        location: 'query',
      });
    });
  });
  describe('GET active blockchains', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai.request(app).get('/test/blockchains/active');
      chai.expect(res).to.have.status(403);
    });
    it('Should return all active blockchains', async function () {
      await createBaseBlockchain(blockchain);
      await createBaseBlockchain({
        ...blockchain,
        caipId: 'eip155:45',
        isActive: false,
      });

      const res = await chai
        .request(app)
        .get('/test/blockchains/active')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('array');
      const expectedArray = await collectionBlockchains
        .find({
          isActive: true,
        })
        .toArray();
      expectedArray.forEach((obj) => {
        obj._id = obj._id.toString();
      });
      chai.expect(res.body).to.deep.equal(expectedArray);
      chai.expect(res.body.every((obj) => obj.isActive === true)).to.be.true;
    });
  });

  describe('GET blockchain by MongoDBId', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai.request(app).get('/test/blockchains/1234');
      chai.expect(res).to.have.status(403);
    });

    it('Should return blockchain with the proper blockchainId', async function () {
      const createResponse = await createBaseBlockchain(blockchain);

      const res = await chai
        .request(app)
        .get(`/test/blockchains/${createResponse.body.insertedId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('object');
      chai
        .expect(res.body._id.toString())
        .to.be.equal(createResponse.body.insertedId);
    });
    it('Should return null if no blockchain found', async function () {
      const res = await chai
        .request(app)
        .get('/test/blockchains/111111111111111111111111')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('object').that.is.empty;
    });
    testNonMongodbId({
      method: 'get',
      path: '/test/blockchains/1111111111111111',
      body: {},
      query: {},
      field: 'blockchainId',
    });
  });
  describe('PUT blockchain', () => {
    describe('Core of the route', () => {
      it('Should return 403 if no token is provided', async function () {
        const res = await chai.request(app).put('/test/blockchains/1234');
        chai.expect(res).to.have.status(403);
      });
      modifyBlockchainField({ field: 'chainId', value: 'modifiedChainId' });
      modifyBlockchainField({ field: 'caipId', value: 'eip155:343' });
      modifyBlockchainField({ field: 'label', value: 'newLabel' });
      modifyBlockchainField({ field: 'icon', value: 'newIcon' });
      modifyBlockchainField({
        field: 'rpc',
        value: [
          'https://new.goerli.blockpi.network/v1/rpc/public',
          'https://new.rpc.ankr.com/eth_goerli',
          'https://new.eth-goerli.public.blastapi.io',
        ],
      });
      modifyBlockchainField({
        field: 'nativeTokenSymbol',
        value: 'newNativeTokenSymbol',
      });
      modifyBlockchainField({ field: 'isEvm', value: true });
      modifyBlockchainField({
        field: 'isTestnet',
        value: true,
      });
      modifyBlockchainField({ field: 'isActive', value: true });
      modifyBlockchainField({
        field: 'transactionExplorerUrl',
        value: 'https://new.goerli.etherscan.io/tx/{hash}',
      });
      modifyBlockchainField({
        field: 'addressExplorerUrl',
        value: 'https://new.goerli.etherscan.io/address/{hash}',
      });
      it('Should fail if no blockchain found', async function () {
        const res = await chai
          .request(app)
          .put('/test/blockchains/111111111111111111111111')
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(res).to.have.status(404);
        chai.expect(res.body).to.deep.equal({ msg: 'No blockchain found' });
      });
    });
    describe('Validators', () => {
      it('PUT /blockchains/11111111111111111111 - rpc - Should fail if rpc is not an array', async function () {
        // Make a request to create the offer with invalid data
        const res = await chai
          .request(app)
          .put('/test/blockchains/11111111111111111111')
          .set({ Authorization: `Bearer ${mockedToken}` })
          .send({ rpc: 'notAnArray' });
        // Assertions
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(
          res.body.some(
            (err) => err.msg === 'must be an array' && err.param === 'rpc'
          )
        ).to.be.true;
      });
      it('PUT /blockchains/11111111111111111111 - rpc - Should fail if rpc contains non-URL values', async function () {
        // Make a request to create the offer with invalid data
        const res = await chai
          .request(app)
          .put('/test/blockchains/11111111111111111111')
          .set({ Authorization: `Bearer ${mockedToken}` })
          .send({ rpc: ['notAnURL', 123] });
        // Assertions
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(
          res.body.some((err) => err.msg === 'must be an array of URL')
        ).to.be.true;
      });
      const testCases = [
        'chainId',
        'caipId',
        'label',
        'icon',
        'rpc',
        'nativeTokenSymbol',
        'isEvm',
        'isTestnet',
        'isActive',
        'transactionExplorerUrl',
        'addressExplorerUrl',
      ];
      for (const testCase of testCases) {
        if (testCase == 'caipId') {
          testNonCaipId({
            method: 'put',
            path: '/test/blockchains/11111111111111111111',
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (
          testCase == 'transactionExplorerUrl' ||
          testCase == 'addressExplorerUrl'
        ) {
          testNonURL({
            method: 'put',
            path: '/test/blockchains/11111111111111111111',
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (
          testCase == 'isEvm' ||
          testCase == 'isTestnet' ||
          testCase == 'isActive'
        ) {
          testNonBoolean({
            method: 'put',
            path: '/test/blockchains/11111111111111111111',
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (testCase !== 'rpc') {
          testNonString({
            method: 'put',
            path: '/test/blockchains/11111111111111111111',
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        }
        testNonEmpty({
          method: 'put',
          path: '/test/blockchains/11111111111111111111',
          body: {
            ...blockchain,
            [testCase]: '',
          },
          query: {},
          field: testCase,
        });
      }
    });
  });
  describe('DELETE blockchain', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai
        .request(app)
        .delete('/test/blockchains/11111111111111111111');
      chai.expect(res).to.have.status(403);
    });
    it('Should delete one blockchain', async function () {
      const createResponse = await chai
        .request(app)
        .post(blockchainPath)
        .set('Authorization', `Bearer ${mockedToken}`)
        .send(blockchain);
      toDeleteDb.push({
        collection: collectionBlockchains,
        id: createResponse.body.insertedId,
      });
      chai.expect(createResponse).to.have.status(200);
      chai.expect(createResponse.body).to.have.property('acknowledged', true);
      chai.expect(createResponse.body).to.have.property('insertedId');
      const deleteResponse = await chai
        .request(app)
        .delete(`/test/blockchains/${createResponse.body.insertedId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(deleteResponse).to.have.status(200);
      chai
        .expect(deleteResponse.body)
        .to.deep.equal({ acknowledged: true, deletedCount: 1 });
      chai.expect(
        await collectionBlockchains.findOne({
          _id: new ObjectId(createResponse.body.insertedId),
        })
      ).to.be.null;
    });
    testNonMongodbId({
      method: 'delete',
      path: '/test/blockchains/1111111111111111',
      body: {},
      query: {},
      field: 'blockchainId',
    });
  });
  describe('POST useful address', () => {
    describe('Core of the route', () => {
      it('Should return 403 if no token is not provided', async function () {
        const res = await chai
          .request(app)
          .post('/test/blockchains/useful-address/1234');
        chai.expect(res).to.have.status(403);
      });

      it('Should return 404 if blockchain is not found', async function () {
        const response = await chai
          .request(app)
          .post(
            `/test/blockchains/useful-address/644156301cfda3bbf3b8fed8?contract=1111111`
          )
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(usefulAddress);
        chai.expect(response).to.have.status(404);
        chai.expect(response.body).to.deep.equal({
          msg: 'No blockchain found',
        });
      });

      it('Should create a new useful address with the proper fields', async function () {
        const createResponse1 = await chai
          .request(app)
          .post(blockchainPath)
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(blockchain);
        toDeleteDb.push({
          collection: collectionBlockchains,
          id: createResponse1.body.insertedId,
        });
        chai.expect(createResponse1).to.have.status(200);
        chai
          .expect(createResponse1.body)
          .to.have.property('acknowledged', true);
        chai.expect(createResponse1.body).to.have.property('insertedId');

        const createResponse2 = await chai
          .request(app)
          .post(
            `/test/blockchains/useful-address/${createResponse1.body.insertedId}`
          )
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(usefulAddress);
        chai.expect(createResponse2).to.have.status(200);
        chai.expect(createResponse2.body).to.deep.equal({
          acknowledged: true,
          modifiedCount: 1,
          upsertedId: null,
          upsertedCount: 0,
          matchedCount: 1,
        });

        const res = await chai
          .request(app)
          .get(`/test/blockchains/${createResponse1.body.insertedId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(res).to.have.status(200);
        delete res.body._id;
        chai.expect(res.body.usefulAddresses).to.deep.equal([usefulAddress]);
      });

      it('Should update a useful address with the proper fields', async function () {
        const createResponse1 = await chai
          .request(app)
          .post(blockchainPath)
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(blockchain);
        toDeleteDb.push({
          collection: collectionBlockchains,
          id: createResponse1.body.insertedId,
        });
        chai.expect(createResponse1).to.have.status(200);
        chai
          .expect(createResponse1.body)
          .to.have.property('acknowledged', true);
        chai.expect(createResponse1.body).to.have.property('insertedId');

        const createResponse2 = await chai
          .request(app)
          .post(
            `/test/blockchains/useful-address/${createResponse1.body.insertedId}`
          )
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(usefulAddress);
        chai.expect(createResponse2).to.have.status(200);
        chai.expect(createResponse2.body).to.deep.equal({
          acknowledged: true,
          modifiedCount: 1,
          upsertedId: null,
          upsertedCount: 0,
          matchedCount: 1,
        });

        const createResponseUpdate = await chai
          .request(app)
          .post(
            `/test/blockchains/useful-address/${createResponse1.body.insertedId}`
          )
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            contract: 'myContract1',
            address: 'myAddress2',
          });
        chai.expect(createResponseUpdate).to.have.status(200);
        chai.expect(createResponseUpdate.body).to.deep.equal({
          acknowledged: true,
          modifiedCount: 1,
          upsertedId: null,
          upsertedCount: 0,
          matchedCount: 1,
        });

        const res = await chai
          .request(app)
          .get(`/test/blockchains/${createResponse1.body.insertedId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(res).to.have.status(200);
        delete res.body._id;
        chai.expect(res.body.usefulAddresses).to.deep.equal([
          {
            contract: 'myContract1',
            address: 'myAddress2',
          },
        ]);
      });
    });
  });
  describe('DELETE useful address', () => {
    describe('Core of the route', () => {
      it('Should return 403 if no token is not provided', async function () {
        const res = await chai
          .request(app)
          .delete('/test/blockchains/useful-address/1234');
        chai.expect(res).to.have.status(403);
      });

      it('Should return 404 if useful address is not found', async function () {
        const createResponse = await chai
          .request(app)
          .post(blockchainPath)
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(blockchain);
        toDeleteDb.push({
          collection: collectionBlockchains,
          id: createResponse.body.insertedId,
        });
        chai.expect(createResponse).to.have.status(200);
        chai.expect(createResponse.body).to.have.property('acknowledged', true);
        chai.expect(createResponse.body).to.have.property('insertedId');
        const deleteResponse = await chai
          .request(app)
          .delete(
            `/test/blockchains/useful-address/${createResponse.body.insertedId}?contract=11111111`
          )
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(404);
        chai.expect(deleteResponse.body).to.deep.equal({
          msg: 'No blockchain or usefull address found.',
        });
        const deleteResponse2 = await chai
          .request(app)
          .delete(`/test/blockchains/${createResponse.body.insertedId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse2).to.have.status(200);
      });

      it('Should return 404 if blockchain is not found', async function () {
        const deleteResponse = await chai
          .request(app)
          .delete(
            `/test/blockchains/useful-address/644156301cfda3bbf3b8fed8?contract=1111111111`
          )
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(404);
        chai.expect(deleteResponse.body).to.deep.equal({
          msg: 'No blockchain or usefull address found.',
        });
      });

      it('Should delete useful address', async function () {
        const createResponse = await createBaseBlockchain(blockchain);

        const createResponse2 = await chai
          .request(app)
          .post(
            `/test/blockchains/useful-address/${createResponse.body.insertedId}`
          )
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(usefulAddress);
        chai.expect(createResponse2).to.have.status(200);
        const deleteResponse = await chai
          .request(app)
          .delete(
            `/test/blockchains/useful-address/${createResponse.body.insertedId}?contract=myContract1`
          )
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(200);
        const deleteResponse2 = await chai
          .request(app)
          .delete(`/test/blockchains/${createResponse.body.insertedId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse2).to.have.status(200);
      });
    });
  });
});
