/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

//Mutual of Enumclaw 
//
//Matthew Hengal and Jocelyn Borovich - 2019 :) :)
//
//Main file that controls remediation and notifications of all IAM Role events. 
//Remediates actions when possible or necessary based on launch type and tagging. Then, notifies the user/security. 

const AWS = require('aws-sdk');
AWS.config.update({region: process.env.region});
let iam = new AWS.IAM();
const Master = require("./MasterClass").handler;
let path = require("./MasterClass").path; 
let stopper = require("./MasterClass").stopper;
let dbStopper = require("./MasterClass").dbStopper;
let master = new Master();

let improperLaunch = false;

//Variables that allow these functions to be overridden in Jest testing by making the variable = jest.fn() 
//instead of its corresponding function
let callAutoTag = autoTag;
let callCheckTagsAndAddToTable = checkTagsAndAddToTable;
let callRemediate = remediate;
let callRemediateDynamo = remediateDynamo;

//**********************************************************************************************
//remediates a specific action after receiving an event log
async function handleEvent(event) {

   console.log(JSON.stringify(event));
   path.n = 'Path: ';

   //Conditionals for a dynamo event
   if(await master.checkDynamoDB(event)){
      
      path.n += 'DB';
      let convertedEvent = await master.dbConverter(event);

      //Extra console.log statements for testing ===================================
      if (convertedEvent.ResourceName) {
         console.log(`"${convertedEvent.ResourceName}" is being inspected----------`);
      } else {
         console.log(`"${event.Records[0].dynamodb.Keys.ResourceName.S}" is being inspected----------`);
      }
      //==================================================
      
      //remediation process and checking tags for a Dynamodb event
      if (convertedEvent.ResourceType == "Role" && event.Records[0].eventName == 'REMOVE'){
         path.n += '1';
         try{
            let tags = await iam.listRoleTags({RoleName: convertedEvent.ResourceName}).promise();

            if (!(await master.tagVerification(tags.Tags))) {
               path.n += '2';
               await callRemediateDynamo(event, convertedEvent);
            }    
         }
         catch(e){
            if (e.code == 'NoSuchEntity') {
               console.log(e);
               path.n += '!!';
               console.log("**************NoSuchEntity error caught**************");
               console.log(path.n);
               return e;
            }  
         }     
      } else {
         path.n += '6';
         console.log('**************Event didn\'t meet standards, ending program**************')
      } 
      console.log(path.n);
      return;
   }

   //Checks the event log for any previous errors. Stops the function if there is an error. 
   if (master.errorInLog(event)) {
      path.n += 'Error in Log';
      console.log(path.n);
      return; 
   }
   
   console.log(`"${event.detail.requestParameters.roleName}" is being inspected----------`);
   console.log(`Event action is ${event.detail.eventName}---------- `);

   //Conditionals to stop the function from continuing
      if (await master.selfInvoked(event)) {
         path.n += 'Self Invoked';
         console.log(path.n);
         return;
      } else if (!(await master.checkKeyUser(event, 'roleName'))) {
         path.n += 'Key Not Found';
         console.log(path.n);
         return; 
      }
      
   //Checks if the event is invalid. If it is invalid, then remediate. Else check for tags and add to the table with a TTL
   if (await master.invalid(event)) {
      path.n += '1';
      improperLaunch = true; 
      await callRemediate(event);
      if (event.detail.eventName == "CreateRole") {
         console.log(path.n);
         return;
      }
   } else if (event.detail.eventName.includes('Delete')) {
      path.n += '2';
      if (master.isConsole(event)) {
         path.n += '3';
         improperLaunch = true;
         console.log('Action was "Delete" and done through console---------------');
         await callRemediate(event);
      } else {
         path.n += 'X';
      }
   } 
   await callCheckTagsAndAddToTable(event);
   console.log(path.n);
};


   //**********************************************************************************************
   //Checks for and auto adds tags and then adds resource to the table if it is missing any other tags
   async function checkTagsAndAddToTable(event) {

      let params = { RoleName: event.detail.requestParameters.roleName };
      let tags = {};
      path.checkTagsAndAddToTable += '1';

      try {
         tags = await callAutoTag(event, params);
         path.checkTagsAndAddToTable += '2';
      } catch(e) {
         if (e.code == 'NoSuchEntity') {
            console.log(e); 
            path.checkTagsAndAddToTable += '!!';
            console.log("**************NoSuchEntity error caught**************");
            return e;
         }
      }
      if (!(await master.tagVerification(tags.Tags))) {
         path.checkTagsAndAddToTable += '3';
         await master.putItemInTable(event, 'Role', params.RoleName);
      } else {
         path.checkTagsAndAddToTable += '4';
      }
   }


   //**********************************************************************************************
   //Remediates the action performed and sends an email
   async function remediate(event) {

      path.remediate += '=';

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
      
      //Sets up required parameters for remediation
      const erp = event.detail.requestParameters;
      
      let params = {
         RoleName: erp.roleName
      };

      let results = await master.getResults(event, { RoleName: params.RoleName });
      let id = erp.PolicyArn;
      if (results.Action == 'CreateRole' || results.Action == 'DeleteRole') {
         id = results.RoleName;
      } else if (results.Action == 'AttachRolePolicy' || results.Action == 'DetachRolePolicy') {
         id = erp.policyArn; 
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
      
      //Decides, based on the incoming event name, which function to call to perform remediation
      try {
         switch(results.Action){
            case "CreateRole": 
               path.remediate += '1';
               results.Response = 'DeleteRole';
               results.Reason = 'Improper Launch';
               await callRemediateDynamo(event, results);
            return;
            case "PutRolePolicy":
               path.remediate += '2';            
               params.PolicyName = erp.policyName;
               await iam.deleteRolePolicy(params).promise();
               results.PolicyName = erp.policyName;
               results.Response = "DeleteRolePolicy";
            break;
            case "AttachRolePolicy":
               path.remediate += '3'; 
               params.PolicyArn = erp.policyArn;
               await iam.detachRolePolicy(params).promise();
               results.PolicyArn = erp.policyArn;
               results.Response = "DetachRolePolicy";
            break;
            case "DetachRolePolicy":
               path.remediate += '4'; 
               params.PolicyArn = erp.policyArn;
               await iam.attachRolePolicy(params).promise();
               results.PolicyArn = erp.policyArn;
               results.Response = "AttachRolePolicy";
            break;
            case "DeleteRolePolicy":
               path.remediate += '5'; 
               results.PolicyName = erp.policyName;
               results.Response = "Remediation could not be performed";
            break;
            case "DeleteRole": 
               path.remediate += '6'; 
               results.Response = 'Remediation could not be performed';
            break;
         };
      } catch(e) {
         if (e.code == 'NoSuchEntity') {
            stopper.id = id;
            console.log(`Stopper set on ${id}-------------`);
            console.log(e); 
            path.n += '!!';
            console.log("**************NoSuchEntity error caught**************");
            return e;
         }
      }
      
      console.log("Remediation completed-----------------");
      results.Reason = 'Improper Tags';
      if (improperLaunch) {
         results.Reason = 'Improper Launch';
      }
      if (results.Response == 'Remediation could not be performed') {
         delete results.Reason;
      }
      path.n += '=';
      await master.notifyUser(event, results);
   }


   //**********************************************************************************************
   //Function to remediate the event coming from DynamoDB. Remediates all attachments before removing the role
   async function remediateDynamo(event, results){

      let params = {}; 
      if (results.KillTime) {
         params = { RoleName: results.ResourceName }
      } else {
         params = { RoleName: event.detail.requestParameters.roleName };
      }

      let count  = 0;

      //lists the attachments
      let inline = {}; 
      let attached = {};
      try {
         inline = await iam.listRolePolicies(params).promise(); 
         attached = await iam.listAttachedRolePolicies(params).promise(); 
      } catch(e) {
         if (e.code == 'NoSuchEntity') {
            console.log(e); 
            path.n += '!!';
            console.log("**************NoSuchEntity error caught**************");
            return e;
         }
      }

      //checks if there is at least one attachment that needs remediation
      if (inline.PolicyNames[0] || attached.AttachedPolicies[0]) {
         
         let newEvent = event;
         if (results.KillTime) {
            path.n += '3';
            let requestParameters = {
               roleName: params.RoleName,
               policyName: '',
               policyArn: '' 
            }
            newEvent = await master.TranslateDynamoToCloudwatchEvent(event, requestParameters);
         }
         
         //Remediates all the inline policies
         if (inline.PolicyNames[0]) {

            path.n += '4';
            for (let i = 0; i < inline.PolicyNames.length; i++) {
               count += 1;
               newEvent.detail.requestParameters.policyName = inline.PolicyNames[i];
               newEvent.detail.eventName = 'PutRolePolicy';
               console.log(`deleting "${newEvent.detail.requestParameters.policyName}"---------`);
               await callRemediate(newEvent);
               
            }
         }
         //Remediates all the attached policies
         if (attached.AttachedPolicies[0]) {

            path.n += '5';
            for (let i = 0; i < attached.AttachedPolicies.length; i++) {
               count += 1;
               newEvent.detail.requestParameters.policyArn = attached.AttachedPolicies[i].PolicyArn;
               newEvent.detail.eventName = 'AttachRolePolicy';
               console.log(`detaching "${newEvent.detail.requestParameters.policyArn}"---------`);
               await callRemediate(newEvent);
            }   
         }
      }

      if (!results.KillTime && count != 0) { 
         dbStopper.c = count;
         console.log(`Stopper placed for ${count} more invocations--------`)
      }

      path.n += '-';
      console.log(`deleting "${params.RoleName}"----------`);
      let InstanceProfiles = await iam.listInstanceProfilesForRole(params).promise()

      //removes an instance profile, if it is attached, from the role in order to delete the role.
      if (InstanceProfiles.InstanceProfiles[0]) {

         params.InstanceProfileName = params.RoleName;
         path.n += '.';
         iam.removeRoleFromInstanceProfile(params).promise();
         delete params.InstanceProfileName;
      } 

      //Deletes the role 
      await iam.deleteRole(params).promise();
      console.log('Remediation complete----------');
      path.n += '-';
      await master.notifyUser(event, results);
   }


   //**********************************************************************************************
   //Automatically adds missing tags, tag3 and Environment, if needed 
   async function autoTag(event, params) {

      let tags = await iam.listRoleTags(params).promise();
      
      //checks if env is sandbox AND checks for and adds tag3 tag
      if (await master.snd() && await master.needsTag(tags.Tags, `${process.env.tag3}`)){
         
         //Adds the tag3 tag to the resource
         await iam.tagRole(await master.getParamsForAddingTags(event, params, `${process.env.tag3}`)).promise();
         tags = await iam.listRoleTags(params).promise();
         path.n += '5';
         console.log(`${process.env.tag3} added---------`);
      }
      
      //checks if the resource has an environment tag and adds it if it doesn't
      if (await master.needsTag(tags.Tags, 'Environment')) {
         
         //Adds the Environment tag to the resource
         await iam.tagRole(await master.getParamsForAddingTags(event, params, 'Environment')).promise();
         tags = await iam.listRoleTags(params).promise();
         path.n += '6';
         console.log('Environment Tag added---------');
      }
      return tags;
   }




exports.handler = handleEvent;
exports.checkTagsAndAddToTable = checkTagsAndAddToTable; 
exports.remediateDynamo = remediateDynamo;
exports.autoTag = autoTag;
exports.remediate = remediate;

//overrides the given function (only for jest testing)
exports.setIamFunction = (value, funct) => {
   iam[value] = funct;
}

exports.setAutoTag = (funct) => {
   callAutoTag = funct;
}

exports.setRemediate = (funct) => {
   callRemediate = funct;
}

exports.setRemediateDynamo = (funct) => {
   callRemediateDynamo = funct;
}

exports.setCheckTagsAndAddToTable = (funct) => {
   callCheckTagsAndAddToTable = funct;
}





//Created by Matthew Hengl and Jocelyn Borovich. Ur fav 2019 interns!! :) :)
