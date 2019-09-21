# guard-rails

guard-rails is an automated aws resource management and remediation system. It monitors all IAM actions, deployment types, environments and resource tags. This data is then used to decide whether the action done to an IAM resource is valid or not and determine the best response. Responses to invalid actions may include: notifying security, notifying the user, remediating the action immediately and archiving the resource created for some time and notifying the user of potential deletion. 


# Main js files______________________________________________________________________________________________________


# MasterClass.js

Class file containing many functions used throughout the main files to perform specific jobs.
All functions perform a specific task and none are built for an individual file.

# RemediateGroups.js

Main file that controls remediation and notifications of all IAM Group events.
Remediates actions when possible or necessary based on launch type and tagging. Then, notifies the user/security. 

# RemediatePolicies.js

Main file that controls remediation and notifications of all IAM Policy events. 
Remediates actions when possible or necessary based on launch type and tagging. Then, notifies the user/security. 

# RemediateRoles.js

Main file that controls remediation and notifications of all IAM Role events. 
Remediates actions when possible or necessary based on launch type and tagging. Then, notifies the user/security. 

# RemediateUsers.js

Main file that controls remediation and notifications of all IAM User events. 
Remediates actions when possible or necessary based on launch type and tagging. Then, notifies the user/security. 

# DeleteUserSQS.js

//Supporting function file that controls the remediation of creating a user. 
//Invoked by SQS after some time, this function will delete the specified user.
//SQS waits to invoke this function so the user has enough time to be created. 







