"use strict";

module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: jsonToString(
      {
        message: "Go Serverless v2.0! Your function executed successfully!",
        input: event,
      },
      null,
      2
    ),
  };
};
