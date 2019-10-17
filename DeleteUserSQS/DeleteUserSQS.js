/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

//Mutual of Enumclaw 
//
//Matthew Hengal and Jocelyn Borovich - 2019 :) :)
//
//Supporting function file that controls the remediation of creating a user. 
//Invoked by SQS after some time, this function will delete the specified user.
//SQS waits to invoke this function so the user has enough time to be created. 

const AWS = require('aws-sdk');
AWS.config.update({region: process.env.region});
let iam = new AWS.IAM();
let sqs = new AWS.SQS();
const Master = require("./MasterClass").handler;
let path = require("./MasterClass").path; 
let master = new Master();


async function handlerSQSEvent(event){

    path.n = 'Path: ';
    console.log(event);
    let receiptInfo = event.Records[0].receiptHandle;
    console.log(receiptInfo);
    let bodyInfo = JSON.parse(event.Records[0].body);
    console.log(bodyInfo);

    let params = {
      UserName: bodyInfo.detail.requestParameters.userName
    };
    
    let results = await master.getResults(bodyInfo, { UserName: params.UserName});
    
    console.log("Testing to see if login profile is done.");
    
    try{
      results.Response = "DeleteUser";
      results.Reason = 'Improper Launch';

      console.log("Deleting Login Profile.");
      await iam.deleteLoginProfile(params).promise();
      
      console.log("Deleting User.");
      await iam.deleteUser(params).promise();
      
      console.log("Getting info for deleting the message.");
      
      params = {
          QueueUrl: `https://sqs.${process.env.region}.amazonaws.com/${process.env.devNum2}/remediation-que-${process.env.environment}-${process.env.region}`,
          ReceiptHandle: receiptInfo  
      };
      
      console.log("Deleting the message");
      await sqs.deleteMessage(params).promise();
      
      console.log("Done");
    }catch(e){
      console.log("Could not delete login profile yet. Will recieve another SQS message and try again.");
      return;
    }
    console.log(results);
    master.notifyUser(bodyInfo, results);
}

exports.handler = handlerSQSEvent;

exports.setFunction = (value, funct) => {
  iam[value] = funct;
}

exports.setSQS = (value, funct) => {
  sqs[value] = value;
}