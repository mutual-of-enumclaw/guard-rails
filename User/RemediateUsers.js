/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

//Mutual of Enumclaw 
//
//Matthew Hengal and Jocelyn Borovich - 2019 :) :)
//
//Main file that controls remediation and notifications of all IAM User events. 
//Remediates actions when possible or necessary based on launch type and tagging. Then, notifies the user/security. 

const AWS = require('aws-sdk');
AWS.config.update({region: process.env.region});
let iam = new AWS.IAM();
const Master = require("./MasterClass").handler;
let path = require("./MasterClass").path;
let stopper = require("./MasterClass").stopper;
let dbStopper = require("./MasterClass").dbStopper; 
let master = new Master();
let sqs = new AWS.SQS();

let improperLaunch = false;

//**********************************************************************************************
//remediates a specific action after receiving an event log
async function handleEvent(event) {

   console.log(JSON.stringify(event));
   path.n = 'Path: ';
   
   //Start of one function
   if(master.checkDynamoDB(event)){
      
      path.n += 'DB';
      let convertedEvent = master.dbConverter(event);

      //Extra console.log statements for testing ===================================
      if (convertedEvent.ResourceName) {
         console.log(`"${convertedEvent.ResourceName}" is being inspected----------`);
      } else {
         console.log(`"${event.Records[0].dynamodb.Keys.ResourceName.S}" is being inspected----------`);
      }
      //==================================================
      if (convertedEvent.ResourceType == "User" && event.Records[0].eventName == 'REMOVE'){

         path.n += '1';
         try{
            let tags = await iam.listUserTags({UserName: convertedEvent.ResourceName}).promise();

            if (!(master.tagVerification(tags.Tags))) {
               path.n += '2';
               await remediateDynamo(event, convertedEvent);
            }    
         }
         catch(e){
            if (e.code == 'NoSuchEntity') {
               console.log(e);
               path.n += '!!';
               console.log(path.n);
               console.log("**************NoSuchEntity error caught**************");
               return e;
            }  
         }     
      } else {
         path.n += '6';
         console.log('Remediation could not be performed, event didn\'t meet standards----------')
      }
      console.log(path.n);
      return;
   }
   //End of the function

   //Start of the function
   //Checks the event log for any previous errors. Stops the function if there is an error. 
   if (master.errorInLog(event)) {
      path.n += 'Error in log';
      console.log(path.n);
      return; 
   }
   //End of the function
   
   console.log(`"${event.detail.requestParameters.userName}" is being inspected----------`);
   console.log(`Event action is ${event.detail.eventName}---------- `);

   //Conditionals to stop the function from continuing
   if (master.selfInvoked(event)) {
      path.n += 'Self Invoked';
      console.log(path.n);
      return; 
   }
   
   if (!(master.checkKeyUser(event, 'userName'))) {
      path.n += 'Key Not Found';
      console.log(path.n);
      return;
   }

   //Checks if the event is invalid. If it is invalid, then remediate. Else check for tags and add to the table with a TTL
   if (master.invalid(event)) {
      path.n += '1';
      improperLaunch = true;
      await remediate(event);
      if(event.detail.eventName == 'CreateUser' || event.detail.eventName == 'AddUserToGroup'){
         console.log(path.n);
         return;
      }
   }else if(event.detail.eventName.includes('Delete')){
      path.n += '2';
      if(master.isConsole(event)){
         path.n += '3';
         improperLaunch = true;
         console.log("Action was delete and done through console.");
         await remediate(event);
      }else{
         path.n += 'X';
      } 
   }
   //End of the function
   
   await checkTagsAndAddsToTable(event);
   console.log(path.n);
};

//Checks for and auto adds tags and then adds resource to the table if it is missing any other tags
async function checkTagsAndAddsToTable(event){
   path.n += '4';
   let params = {UserName: event.detail.requestParameters.userName};
   let tags = {};
   try{
      tags = await autoTag(event, params);
   }catch(e){
      if (e.code == 'NoSuchEntity') {
         console.log(e);
         path.n += '!!';
         console.log("**************NoSuchEntity error caught**************");
         return e;
      } 
   }

   if (!(master.tagVerification(tags.Tags))) {
      path.n += '8';
      await master.putItemInTable(event, 'User', params.UserName);
   }
}

//**********************************************************************************************
//Remediates the action performed and sends an email
async function remediate(event) {
   path.n += '=';

   if (dbStopper.c) {
      console.log(`Stopper: ${JSON.stringify(dbStopper)}`);
      dbStopper.c -= 1;
      path.remediate += '-';
      console.log(`Stopper in place for ${dbStopper.c} more invocations`);
      if (dbStopper.c == 0) {
         console.log('Stopper removed----------');
         path.remediate += 'X';
         delete dbStopper.c;
      }
      path.remediate += '!'
      console.log(`*******Remediation completed in previous invocation*******`)
      return; 
   }

   //Sets up required parameters
   const erp = event.detail.requestParameters;
   
   let params = {
      UserName: erp.userName
   };
   let results = await master.getResults(event, { UserName: params.UserName });

   let id = erp.PolicyArn;
   if (results.Action == 'CreateUser' || results.Action == 'DeleteUser') {
      id = results.UserName;
   } else if (results.Action == 'AttachUserPolicy' || results.Action == 'DetachUserPolicy') {
      id = erp.policyArn; 
   } else if (results.Action == 'AddUserToGroup' || results.Action == 'RemoveUserFromGroup'){
      id = erp.groupName;
   } else {
      id = erp.policyName; 
   }
   if (process.env.environment != 'snd' && stopper.id == id) {
      console.log(`*********Resource has already been remediated manually*********`);
      console.log(`Stopper removed-------`);
      stopper.id = '';
      path.n = "!";
      return;
   }
   
   //Decides, based on the incoming event, which function to call to perform remediation
   try{
      switch(results.Action){
         case "AddUserToGroup":   
            params.GroupName = erp.groupName;
            await iam.removeUserFromGroup(params).promise();
            results.GroupName = erp.groupName;
            results.Response = "RemoveUserFromGroup";
         break;
         case "RemoveUserFromGroup":
            params.GroupName = erp.groupName;
            await iam.addUserToGroup(params).promise();
            results.GroupName = erp.groupName;
            results.Response = "AddUserToGroup";
         break;
         case "PutUserPolicy":
            params.PolicyName = erp.policyName;
            await iam.deleteUserPolicy(params).promise();
            results.PolicyName = erp.policyName;
            results.Response = "DeleteUserPolicy";
         break;
         case "AttachUserPolicy":
            params.PolicyArn = erp.policyArn;
            await iam.detachUserPolicy(params).promise();
            results.PolicyArn = erp.policyArn;
            results.Response = "DetachUserPolicy";
         break;
         case "DetachUserPolicy":
            params.PolicyArn = erp.policyArn;
            await iam.attachUserPolicy(params).promise();
            results.PolicyArn = erp.policyArn;
            results.Response = "AttachUserPolicy";
         break;
         case "DeleteUserPolicy":
            let error = await checkTagsAndAddsToTable(event);
            if(error){
               return;
            }
            results.PolicyName = erp.policyName;
            results.Response = "Remediation could not be performed";
         break;
         case "DeleteUser":
            results.Response = 'Remediation could not be performed';
         break;
         case "CreateUser":
            //await new Promise(resolve => {setTimeout(resolve, 2000)}); //Once we get SQS set up, delete this line.
            results.Response = 'DeleteUser';
            results.Reason = 'Improper Launch';
            await remediateDynamo(event, results);
         return;
      }
   }catch(e){
      if (e.code == 'NoSuchEntity') {
         stopper.id = id;
         console.log(e); 
         path.n += '!!';
         console.log("**************NoSuchEntity error caught**************");
         return e;
      }
   }
   console.log("Remediation completed-----------------");
   results.Reason = 'Improper Tags';
   if(improperLaunch){
      results.Reason = `Improper Launch`;
   }
   if(results.Response == "Remediation could not be performed"){
      delete results.Reason;
   }
   path.n += '=';
   await master.notifyUser(event, results);
};


//**********************************************************************************************
//Function to remediate the event coming from DynamoDB. Remediates all attachments before removing the user
async function remediateDynamo(event, results){
   
   let params = {};
   if(results.KillTime){
      params = {UserName: results.ResourceName};
   }else{
      params = {UserName: event.detail.requestParameters.userName}
   }
   //lists the attachments
   let inline = {}; 
   let attached = {};
   let userInfo = {};
   try {
      inline = await iam.listUserPolicies(params).promise(); 
      attached = await iam.listAttachedUserPolicies(params).promise(); 
      userInfo = await iam.listGroupsForUser(params).promise();
   } catch(e) {
      if (e.code == 'NoSuchEntity') {
         console.log(e); 
         path.n += '!!';
         return e;
      }
   }

   console.log("Checking to see if this user is in any groups.");
   console.log(userInfo.Groups.length);
   if(userInfo.Groups.length != 0){

      console.log("Detaching users from groups.");
      userInfo.Groups.forEach(async function(element) {
         params.GroupName =element.GroupName;
         console.log(`Removing the user ${params.UserName} from the group ${params.GroupName}`);
         await iam.removeUserFromGroup(params).promise();
         delete params.GroupName;
         userInfo = await iam.listGroupsForUser(params).promise();
      });
      console.log("Done removing user from all groups.");
   }

   //checks if there is at least one attachment that needs remediation
   if (inline.PolicyNames[0] || attached.AttachedPolicies[0]) {

      let newEvent = event;
      if(results.KillTime){
         path.n += '3';
         let requestParameters = {
            userName: params.UserName,
            policyName: '',
            policyArn: '' 
         }
         newEvent = master.TranslateDynamoToCloudwatchEvent(event, requestParameters);
      }
      //Remediates all the inline policies
      if (inline.PolicyNames[0]) {

         path.n += '4';
         for (let i = 0; i < inline.PolicyNames.length; i++) {
            newEvent.detail.requestParameters.policyName = inline.PolicyNames[i];
            newEvent.detail.eventName = 'PutUserPolicy';
            await remediate(newEvent);
         }
      }
      //Remediates all the attached policies
      if (attached.AttachedPolicies[0]) {

         path.n += '5';
         for (let i = 0; i < attached.AttachedPolicies.length; i++) {
            newEvent.detail.requestParameters.policyArn = attached.AttachedPolicies[i].PolicyArn;
            newEvent.detail.eventName = 'AttachUserPolicy';
            console.log(`detaching "${newEvent.detail.requestParameters.policyArn}"---------`);
            await remediate(newEvent);
         }   
      }
   }

   if (!results.KillTime && count != 0) { 
      dbStopper.c = count;
      console.log(`Stopper placed for ${count} more invocations--------`)
   }

   event.detail.eventName = "CreateUser";
   console.log("Checking to see if it's in dev and deployed through console.");
   if(!(master.snd(event)) && master.isConsole(event)){
      console.log("Getting the params to send the message");
      let sqsParams = {
         MessageBody: JSON.stringify(event),
         QueueUrl: `https://sqs.us-east-1.amazonaws.com/674071931206/remediation-que-${process.env.environment}-us-east-1`,
         DelaySeconds: 10,
      };
      console.log(sqsParams);
      console.log("Sending message to SQS");
      await sqs.sendMessage(sqsParams).promise();
      console.log("Message sent to SQS");
   }
   //Deletes the user
   path.n += '-';
   console.log(`deleting "${params.UserName}"----------`);
   try{
      await iam.deleteLoginProfile(params).promise();
   }catch(e){
      throw e;
   }
   await iam.deleteUser(params).promise();
   console.log('Remediation complete----------');
   path.n += '-';
   await master.notifyUser(event, results);
}


//**********************************************************************************************
//Automatically adds missing tags, TechOwner and Environment, if needed 
async function autoTag(event, params) {

   let tags = await iam.listUserTags(params).promise(); //There was an error here.

   //checks if env is sandbox AND checks for and adds TechOwner tag
   if (master.snd(event) && master.needsTag(tags.Tags, `${process.env.tag3}`)){
      
      //Adds the TechOwner tag to the resource
      await iam.tagUser(await master.getParamsForAddingTags(event, params, `${process.env.tag3}`)).promise();
      tags = await iam.listUserTags(params).promise();
      path.n += '5';
      console.log(`${process.env.tag3} added---------`);
   }
   
   //checks if the resource has an environment tag and adds it if it doesn't
   if (master.needsTag(tags.Tags, 'Environment')) {
      
      //Adds the Environment tag to the resource
      await iam.tagUser(await master.getParamsForAddingTags(event, params, 'Environment')).promise();
      tags = await iam.listUserTags(params).promise();
      path.n += '6';
      console.log('Environment Tag added---------');
   }
   return tags;
}


exports.handler = handleEvent;

exports.setFunction = (value, funct) => {
   iam[value] = funct;
}

exports.setSqs = (value, funct) => {
   sqs[value] = funct;
}