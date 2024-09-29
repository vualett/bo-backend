// import { Mongo } from "meteor/mongo";
import { API } from '../api';

API.get('/data/:pipelineName', async (req, res) => {
  // try {
  //   const dataPipelineDoc = DataPipelines.findOne({ _id: req.params.pipelineName });
  //   if (!dataPipelineDoc) {
  //     res.statusCode = 404;
  //     return res.end("Not found");
  //   }
  //   const { pipeline, collectionName } = dataPipelineDoc;
  //   if (!["users", "deals"].includes(collectionName)) {
  //     return res.end("Not Allow");
  //   }
  //   const DataCollection = Mongo.Collection.get(collectionName);
  //   const data = await DataCollection.rawCollection()
  //     .aggregate(JSON.parse(pipeline))
  //     .toArray();
  //   return res.json(data);
  // } catch (error) {
  //   console.log(error);
  //   res.statusCode = 500;
  //   return res.end("Internal Server Error");
  // }
});
