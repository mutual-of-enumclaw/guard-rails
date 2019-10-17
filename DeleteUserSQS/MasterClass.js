/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

//Mutual of Enumclaw 
//
//Matthew Hengal and Jocelyn Borovich - 2019 :) :)
//
//Class containing many functions used throughout the main files to perform specific jobs.
//All functions perform a specific task and none are built for an individual file.

const AWS = require('aws-sdk'); 
AWS.config.update({region: process.env.region});
const sns = new AWS.SNS();
const ses = new AWS.SES();
const dynamodb = new AWS.DynamoDB();

let reason = { Reason: 'Reason not specified'};
let subject = { Subject: '¯\\_(ツ)_/¯' };
let path = { n: 'Path: ' };
let stopper = { id: '' };
let dbStopper = {};


class Master {

   //**********************************************************************************************
   //Checks the event log for previous errors
   /**/errorInLog(event) {
      if (event.detail.errorCode) {
         console.log(`************There was an error in the event log (code: "${event.detail.errorCode}")************`);
         return true;
      }
      return false;
   }

   
   //**********************************************************************************************
   //Checks to see if there is any specific properties of the resource before running the function (testing only)
   /**/checkKeyUser(event, resourceName){
      //checking event.detail.responseElements.policy.policyName
      if(event.detail.userIdentity.principalId.includes(`${process.env.internEmail2}`) ||
      event.detail.userIdentity.principalId.includes(`${process.env.internEmail1}`) ||
      event.detail.userIdentity.arn.includes(`${process.env.serverlessInfo}`) ||
      event.detail.requestParameters[resourceName].includes("@@@")) {

         console.log("Found the key!~~~~");
         return true;
      }
      console.log("*************Did not find key, ending program*************");
      return false;
   }
   
   
   //**********************************************************************************************
   //Checks to see if the event coming from DynamoDB.
   /**/checkDynamoDB(event){
      if(event.Records){
         console.log("Event is DynamoDB!~~~~~~~~~~~");
         return true;
      }
      console.log("Event is NOT DynamoDB!~~~~~~~~~~~~");
      return false;
   }
   
   
   //**********************************************************************************************
   //Converts the information coming from DynamoDB into an actual JSON file for js to read
   /**/dbConverter(event){
      let info = event.Records[0].dynamodb.OldImage;
      var unmarshalled = AWS.DynamoDB.Converter.unmarshall(info);
      return unmarshalled;
   }
   
   
   //**********************************************************************************************
   //checks if the event was from the function itself
   /**/selfInvoked(event) {
      if (event.detail.userIdentity.arn.includes(process.env.name)) {
         console.log('****************************Self invoked****************************');
         return true;
      }
      return false;
   }
   
   
   //**********************************************************************************************
   //Gets the entity that performed the action and returns it.
   /**/getEntity(event){
      let id = event.detail.userIdentity.principalId;
      
      if (id.includes(':') && !id.includes('@')) {
         let index = id.indexOf(":") + 1;
         return `${id.substring(index)} --Likely a lambda function`;
      } else if (id.includes('@')) {
         let index = id.indexOf(":") + 1;
         return id.substring(index);
      } else {
         return `${event.detail.userIdentity.userName}  --Launched through serverless/TFS`;
      }
   }
   
   
   //**********************************************************************************************
   //Validates the event log (determines whether it comes from console, console being invalid)
   /**/invalid(event){
      
      //checks if self invoked
      if (this.snd()) {   
         console.log('****************Performed in Sandbox so event is valid****************');
         return false;
         
      } else if (this.isConsole(event)) {
         
         console.log('Performed through console and in dev/prd so event log is invalid-----------------------');
         return true;
      }
      console.log('****************Performed through Serverless/TFS so event is valid****************');
      return false;
   };
   
   //**********************************************************************************************
   //Function used to check to see if the event is coming from console
   /**/isConsole(event){
      if((event.detail.userIdentity.sessionContext.sessionIssuer) ||
      (event.detail.userAgent != 'cloudformation.amazonaws.com')){
         return true;
      }
      return false;
   }


   //**********************************************************************************************
   //Creates the HTML for the user that performed the action depending on the event type and returns it
   /**/getHtml(event, results) {

      let env = process.env.environment;
      let message = this.structureMessage(results);
      let resultsArray = Object.entries(results);
      subject.Subject = 'Your AWS stuff was deleted...¯\\_(ツ)_/¯';
      let attachmentId = `attachment "${resultsArray[4][1]}" on`
      let resourceName = resultsArray[3][1];
      let header = 'Your AWS stuff was remediated...</br>¯\\_(ツ)_/¯';
      let description = '';
      let howToFixMessage = `Please add the correct tags to "${resourceName}" to prevent deletion (${process.env.tag1} and ${process.env.tag2}).`;
      let img = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMTEhUTExIVFhUVFxYWFxUYFxUXFxgXFxcWFhcVFRgYHSggGBolHRUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKBQUFDgUFDisZExkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//AABEIARMAtwMBIgACEQEDEQH/xAAcAAACAgMBAQAAAAAAAAAAAAAEBQMGAAIHAQj/xABBEAABAwMBBQUGBAQFBAIDAAABAAIRAwQhMQUSQVFhBiJxgZETobHB0fAyQlLhBxRichUjM4LxU5KiwrLSFjRD/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKLccXc/w9BzWlvYye99/fzTWtTbMAafYH1KMtrQwCepg8eUoBrehn0MaYGgRNetBAE70SMcYMfX0RZpRnz6k/lB95SupX3d/GS0AHUiZx4mB6INt8BwYdJg9S4cfviinjdrNc7IIyInQCDGmg10QjKcNozqHOcTzx9Sf+1MWDee0eAInhuxHhn3IIr84GDvQW40I/KCM6ayV5StzubpBIOjoM+Y45nPRbXLS54adQC2RjIIAPlAPki6tVrWNbBjrPKTHxQLTSkbuO64Y5HMwOE4MHTKSFpFVwzGIEag5I8dE4tawLnSTu72Z4DiOsnA6JCKkvkEyS4//XWUHm0maOjR59NNFtZsJZiZ/EeUE5A8pUN0XOgCQD0EREZj180wsNA0zM5ycA4cD8vFBFdMDnhkYxPkMeOChtosDRjMDzxzjgiLmju7h4ZzrO6YJjgs2kIpN4lwAIjSccNdCgSxnJ8RzHz8EZWZgACG6g/uspUQNeepgdRMqSlcDdLILjkCIiNZnRAvqU46Fb2d++k4FroI5FZcOJGSAIxGfehKSDsfYTtkK3+TWd347hPE6R4q/DVfNdrVdTcHAwRBBHxC7H2G7WtuGilUgVfQO6eKC4kLyFuVoQg8KxYvUHHW0YMxJcY+eOib29OXbkQYk6ER0PjEjnHBBWo3u+fy5EaeU6n5JrQaYDtHzLenAzzBBIjqg0uKMOzpPqQDokLrb/MjQd3PKZ+EKzsO+NILckH3+I68UqvGw8xyjzyQfXCAV1OTHLA+GPQ+qcWlq1kOOSBnyM+eUqpMEggwRw1bPX9keLjPeiMcZBHSMjhjqgynRO+Xf0lxP98/SPRQ7ZmGjiWieG6M6eU+qM/nZcepx46Z93ohbmtM72PLJPDJ8B6IF1a3DaJdje0AHDhx6A5VfunRnAERyPQD4J3tC9aAGbugxJHhJHP90tZT3nTx57p06E4CAWytiTvZPWcY5YzHzRtUxO6BkCJMYxrz4Iv2ZAhpyRGTGZzx4BR3FLP+oABxmNDkjlmcfRAFeyWtaS3ENnnvGSTzwJ81E6jvDLuvSJ0nwyiq72NBAcXHOBykQJPM/DovHtiAAJiefjJ+WuEAFEMneI4xmD46qIghxDRqdSI8EUxuT4HQDX7laXdLjxInwlArdTzJzyxzkqPd70dM+HRMG0Zj38tYHxQr6eruseQP/KCZtHAMqXZ1d1Ko17TBa6QRwIRNnEEcgfDhIUFrSgx4fvKDtnZbb4uKY3sPiejh+oJ8VybsnemjVZ+guLeg3tZXWGnEoNXhYtnLEHJqDgGREk9506wTACZUMtLjqcDiIP7Ku0riCQMnAk8BqSU8sbmQPh7vmgI34EDjx48ycZ5eqV16xdg8NRxPief0Tas5rWyYmBz+/AJHUuPanujujEZnrPTqghD8/i8tJ6g8ESxkaSeUfXgFL/IEiNDr9fcvbLY7qhIpkEjgSR7uXVB7QIaC50CJiZ92MnCX3V/3S0YB4xBOE8d2ZfABLZJ5krduxqVMjedvEZzpH9IGEFbtbIu726c88TiPFMLOzJO8QAG8xgmMnPl7k/3N7IbDdJn3+KE2jWYwbukcOPiR15IK/cudrPA5GoHD/ccmBz6JS9hJJMTOkb0ctMcNJTmo0vOBgeck9dCc+AlGbP2Qd7IwBMZwY/59ECm22bjQzgzqeRg8NFPeWoGIgNDtNdR9BqrPWsNyW4wDPo0R45KU7UaA15gd/ujpxyfAEoEFlbEzAiPlEeH3zWl00ZA44bzOg3o9E0t6UNaBgEGSeM4O6NTp71GLTv7zp3R+Efm11PU/cIFNekWgj8xA8mjUFAPbrwGnoZJTS7YddN4E9AM5hBMpl0RMfKdEHtoDHIanykx8EXQoy7AyB7/sT5rb2UNAgZkeWf3RVhQM51PyMR7/AHoCHEDjyPgRj4z6rofZrbrajGhxh4GeAMYXO7pvzB8Tke5NuxtU1Hbg1EmDzESg6b7Rp/MPUL1JrYCMR/aRJHPVYg5Fs+kTBOmT5Tgeas2zGQd4mMceAHLroEnsaENxk4Enryj/AJTp53BjwE+Gp5DTCALtDexDBq7BiZzqfL6qXZFlABj9+GvolVtS9pVNRxkZ3dJ3Z1848lc9m0AQBHl8fvkg1ZbudjEcv34+iFvrZzO8JEcWug+vHwVi9iAMDPP6R4oJ9hvGXd7OPHoOfyQVh+36ok/6hiNC2I58D4BRs22Zk0X1HnQa+kDxCuPsA0fgbHHex5SM+5EUagwd1o8APeYQVJ13dVoAp+yEYBmfFoGiJsOzbnGaneI1n3yD81b2BmpME/pA9ZOqiq1o/BJ/uEjP9v1QCUdi02QTmMnA8olbPLW5ganX4Y8Mnoha1xWdo0E5wA6PIGYS+4o1zqDJ6Z9+AOiDNo3cuhzhGJiMmSTJ5Z89OMpRUpmq4SIY0QAcySZMjiSdfJGusmty94nlvAkeTZIU1vXaNCGAcXCXeTdAep9EEZtS0gvBkzDdTH35BK7gd6XZIEgcAJ/MeWDnjwwmtWoXEwHGeJ1PKTGPh04oOtaggDrMDUn4knmUCK6pGoSfy8CZE/OOiKoWgHDAGp0HPy/dH+zAcBHATGsyTH7qdloXCSIBM7o0xz5wgW2NrvGSDGPGJ93BF0bSDHQj4SPinFO1DWjqB55Wm6C7SJn7++aCvbZMNkag/A/RCdm732d20gmHEY8cY84TPa9D34+YPpPoqlRfu1Wni07vkCAPPRB3y3oMqgGRvQMjj1XqFsmDcac5aDgxqM+X1XqDn1gwCCdGguA65gnnwQl7X3mwNXyJ5NJ0++axtbunkcfBDMcN2TwE+k/QBBrTf3w0cIH7K57OdAA4nJ8NfiqVshvfcSZzA/8AY/JXG10zx+4+KBvTJI8c6zjn1RjKOh48+PgEFann0/4TJr5QYbcY45H31CkdZg5jPMYhSSpWO+/qgDdZkaSPL36oWtaVTkekN951TsBbgcygqFayuSfxQOWfdBUH+FVTxk/2Az5uOVc3U/NROgIKW/Yj9Xb8D8ug8wICiq2JaIa2B6eKt1w4cp14IF7SeMD79ECG2tTqcdPqdVLVtJ4E+4eGMx5po5oatyMeOBCBHZ7PAP0CPqWkQOv38kW2nu+OP3W1QjkgXVWd7z/b5odzMkdPn+yKqunJ+/FBVKkDyQJdtVIZ1HyMj4lU/aAh4cBgxHUghWjbbxmNNB7kgotDqtu0/wDUaD4A59zSg7F2cuZtqR1c1o8weaxa7HYaNNvEDBHkII8RCxBz+vRhjfA/fuKWOdDSJ0j5p5fnugDrHgGn5lJqzMPj70CCLZhgDrHvP1Vz2e8mBw+wqdZD8I/qb6QXK57Epku55E+Qx8Sgc0dfD7hH0TxWlKxOpnmpAwhBM2oTxU9IwhqIkhH02jRBq53VRGqiH0AeKErW5GQUEvtOgWrnpdWqFvCEO+9IQG1nlA3FY+aiF9vcUPd3QCCWTriefFTW9Tj/AMoEP3olTOuA1umUE1W466cUK6qShf5oTkr3+YbzE/eEEtTA1Sm9q4+SMvLwD6JBc3W8gB2m9adk7Q1rykIJDJqGOUhueWXKO8Mgq2/wp2eAK1cjLiGNP9LJmP8Ac7/xQXatRO4R+afcvFPXbJMTwEccLEFH23sn2RIGWgY859VW6tLuOPT/ANgF0S4qtuKO8M7wJHpgdOSod9buA9mMkuDR5kGUEOxLQ1HAAaa+J/YR5ldO2HsoU2y7Ljk9OiF7LbFZRYOLiBJ6nWFZGhB5uIatSRkIe4GEAFSqKYkkBAV+0TGcc8lNc2W8ZcUG+ypM7xAx4IM//JxyPuWDtZTzvFo80l2jdUgT3mgeird5e0ZyW+OAgv7Nv0XfmafAheipSfje8TwHmuYirTmWmfAountQtEBphBdLs0WmAUsafaHuz5pBT2o5xgNgKx7DZmeKA9toQJQddpOid1awjlKV1a7RyQL6dm4ppT2WAJGsc0m2httrBEoMdo+LXY5FBNd2TnPIJwEM+1AMAQhb7bJHeHHqg3bbJEoPdpndBK6p2OshSsrdmJ9iwu6uI3j73FcfqVjWIZxcQ0f7iu9WVtDGNGjWtaPJsIJKLeg4k+egWI+haRqclYg4pszblSi4ioCabz/2np0TV0Pex40kDzgkH3K1XmwaBYRuDTVaWuw206LcZ9pveWQgabOENA6D4JgEBbnRGMcg3chLp5ARZW9Oi06hBS9q7TLFQe0naKqARIaOZOT0A1K7pU2XSP8A/Np8gkG1uyNvUkmiwzxDRPwQfOdxdVHOhz4xxOkiRKir02ilTeKrXPeXh9IB+8zdI3S4kbp3pnGkLrHaf+GrKsuoVG06gAG6+dxwAxB1YesRhUu5/h5tBjv/ANb2gwd6m9pb5SRy5IEuw9lvrb5ZqyCQMGDyjwVm2bSeAA4lzTo6Mjo76q3/AMPey7ranUfcNaKlQwGbwO61ogAwYkkpvs/s01jy9zmNad4vaTLTJJBGBunQRphBUbe3IOid2tRzRpHl9E9o7FDiXNGOH7I0bDxMIKjeXbs8FXtpbUIkSrhtnZsThUStYufUgDOYHyQKL3aoZ+LJ5fU8Epftl5OGt8M/FeMr3Fu81CHMe4PZLmDR4LXAb4gYJEjOTlC0aBc5rWjLiAPE6ID/APFycOaVNZ1Bw46j74pz2m7Obm77NkkjvDgMZKr1lbOByCgsvZW23r22aBINVuOep+S+j7GhEEjTAXDf4YWpftGhj8G+8/7WOHxIX0E2mg0LFi2cvUFX9ju4eY66rW/jdhrpaN34o9tUkgFuOaH2kG7p3RHl1QL6Z96JY7KDGgU1IoDmFSNeo6YUvs0G/t146sVs2kpm0wgU3Vx+qnveSR3tamTigZH9wCuNS3CFqWw4hBS3OqOMMp7vXU+pTXZOxXEh1UzxjgnBAGimt64GqA6nTAwGhbvZjKG/nRwyiBV3ggrO2rcZVCrWu7W3hxx5rpO1qZgrnG0n/wCZB54QObkte3dqsa9p4OAcPek1PYVu2oKlKjRY4ad2IPTgFY7ajvNC1fsoHogUXtq5whz2xyGiQ3mzmDRWyvseBO8fBVrbDNzEoH/8IrMG8q1I/wBOiR5vcB8GldgC53/Bq2ijXqn89QMB6MbJ97iuiyg0qLFjivUCGlcAEtMbzdW8Um7V7VZTpFxIxB94Sf8AjPTqU/5e4ouc14eWOc0x3XDAPMTzVONhXud0vc5zeM6IOmUcgEaEAjwOVKxqG2TSLabGHVjQ300R0ZQEUQi2NQtIolr0EgW4UW8s9ogleULcVYXlWulV/c4KDW7ukpqbTMgNySlW2trbv059Ai9g7MqAe1qanIH6R1QWazouiTqm9jTPHRVm47U0LdhdUd+EGcScfeiF2R/EC2uju03ne4Nc3ccerQdfJBadrNjErmfaq2/zGFv6h85Vq2jtZoBJKpG3NrNLhJGuOfkgumzG9weSPFKVX+z9/LW9VYqdTCAG6bhUjtHSzPVXe9eqbt9+CfFB0D+G1P2ez6PAv9pUPXeeY9wCspr9Uj7O0S20oN5Umf8Axn5o17SgLfcdViXvaViAntTZNq02teJbvt+nzVU2QxlN76P6THke8PcVdtuf6RPKD6ELnW0pZeOqAwHbjT4huCgd1Km68Dnj6ItrpAKWX0vZOjmjPVZs2+3mwdR8UDljlI16DbUXpqQUBpetDUQwrKOvVwg2uK0Kt7YvQAconaV6GgyVVaz3VnhjeJygO7M7ONxW9q78DD3eruflouj2tMNbCVbDsBSphoxATKpVHNALfbIt6pl9Jrj4AeUpBtLsdavgtZuOGQRwPM81YjVHPKEvXw3CDmPaHYd81x9nuubwcJJ9JVbstgXDnk1XGR0zrwnRdmIJBJ0gKo3tQGoS3gUE2xaPsw0FWdtbCrNtVlwTZ9aBwQebQuFTNu3Egxrn6J7tG51VbpUzXuaNISd+qxvlvCZ8gUHbbFu7Spt5MaPRoCkc9RzyWhcg2e5YoiV6gcbZzRqf2n3Bc9ptFU1f7o9GhWvtBIoPqh2YMgzBBwW/sqhsd+Xf3H4BAx2a8uBa78TcHx5+YSe+3qFXe0afxDgP6gnF60sIqt4fi6jn5Iqs1lenBzjX5oBLe7kAgqR9wqrWc63fumdycO4DjCJpbUBGfigfC4haVbnCTm9HNafzQ5oBtr778N44Ca7G2c2gJcRvak/JKa21W0zIydBHNNdj7JdX/wAy5d3dRSBx/v8A1eCA53aBpO62XcN4CWg/3aLK9xcFssYCJ1c4j13QQm1S5oNbuHdDeAwAPLRIL5r6Xeov3m6wDw1QB/zF+Xf6dCOftH5/8VFc1toNMmlRcMd1tR0+W80BejtK15h0A8oDc+AXtfbgj8Q9UAO0ts3rKcfyr908nMJHkCktrePcf9KoABoR8VZ6u2mubBIjxSXaPailTbAguOABkoPbO+BdOkY8E1phzxvDRUuxL31S53d34c5v6Tp8AFcKu0206e7PBAo2vViZKZfwy2aX1X3Th3WTTpzxefxHyBA8yq3b0at9cCjRwMl74JDGgwSfpxXXtnWbKFJlKmIawQOZ5k8ydSgO3lqXKIuWhcgmLl4hy9YgY9q6LRb1DGrTxMS4xMc1R7AbtSo3qD6gK2dtboBtKnxqVGCOgMlVW9G5dxwcwH0JCB7bukQUsDjRfun8BndPL+lE0KkFb39EVGkH/g8CEC7atMPacSqNfNdSOMjlyVsZclpNN5yPeOYSja1CeCBE3ap5qQ7WkJPf0i0kjB+9UKy7aTDpaeY0/ZBcNkNa5wcSrl7clm60xjWVy60unsyDI6J7bdoYwSgZbQ7PGsQG1ahJ1JMMHzSDbfZyrad5l1UnSA7HkFYqPaRg0OUsqXAqu3nuMfLj9EFJr1ro5Peg67vvlDnaFUarotQUN3UNEYAOoVZq29Oo87o7vPmgROvarhqV5SrvGjQD+rU+9OrikxmkTy/ZR0rLfMuwOQ18eiCPZ197MOJMk+ZTWz2fcXR/6VLi92p/tGp+C1sWU2OhrAD+oiT6lMjcO5oLnsBlC0p+zo+Lnn8b3c3H5aBMf8XbzXODcu5rwXT+aDop2w3mtf8AF281zs3T+awXT+ZQdD/xZvNYueG7fzWIOl7Tebi/awZbQAyNN52SPQD1QHaG2ca7XtyGMO8OQLsO8E47NWBY3ffmo8uqvx+Z/AeEx5LLGqH3dVvBrWs04kFxB9QgU0KmAihUXm1tnmi6R+A6HkeRQjaiAXbFrvDeGHDQpC65OWuwRqFZarsQk207LfyMOGh+RQVvaVIFVm+t4lWi4Y7iCEpu6KBCys5mhPhw9ES2/n8Q8wsr0UNuIDm3Q4H1C8qXvAu95QaiaJe0dZQM6gdEkY5ytWVnAakDki6g7vkhare4fL5IDKbRggfNFNchLTLB0WXFyGhBvUvO9hE0L6dUjFWTKmY5BY6Y3tF66mRqEtsq5aQQrTaX9J7YdEoEkrdtMnQKbaFJoMtyF5bXAGqCI0ncisVg2bQFRYg6dePFKk57yAIL3uJw1oH0CrXYOqXipXcDNV5dnBAIG6M9IU3bG4/mXts2Og1IfUIjFJpndPLeOPCVLsa3dRe8EROY1kRBdPEoLDd27ajC13FUe6oupPLHDTQ8xzV7pmY5fBLdv7N9qyRG83LT15FBTnuULnL2oSCQRBGoUDnIIrqgHBJbvZw4J7vIe4bIQUy8siEpq0oVvvKfRJLuggSuWbOZNQnlhT16cJhY7P3GAkZdn1QeVeAUdVugUr6GZ5LVrZKCPehsdUoua+87XATC9qbrTPklFIIDKZRNJyCaUTQQN7VMKNNAWugTa2agmZbypWWI5KekExtmBAPZU30/w+ixMarQBK8QOexdrUl1esJqVjvGeDRo0dArHtIAVKbo1kHzClt7aPJRbaxT3gMtLXeQOUE9F8EDhqM+4qWs7BSerdw9gjDuPLGCjjV4O11nn1/ZBXNv7Pc4mowd7iP1D6qtvcr9VaT+6UbU2KKveYQ1/uKCpueoX1FPe2r6Zh7SOvA+BQDig0uTISmuySmppkphsbs6+u7ujH5nn8IHzQJNidnjcVIiGN7zncMcFttQD2ha3QYCt3aC/pWlH+XoZdHedxJ5lVbZ1k5w9oeOg+aBU5u88MHDVb31EU6ZceAR1GxIqlxCVdubjdphnFxQVC5ujUd0UlNC0AjKbUEjQjbdiHYEbbBAxthom1uldAphTcgaUnIunWhK2PWOrFA+qV5asSVlzhYg7c1uEs28yaTvAplUek+37traZnOECipUxTxkx5YTWoZaM6RB681W6N+CWaYjBKZ1L8BuSPCUE4u87rsO66Hw6qSdI+KTPuGv3g7IS6reVqen+Y08CYeB48UFgvLxoEVACOokJHVt7Nzh+Jh/pOPRCt7T0idwuh36agjyCHutp0NYpzzDh8kDx9LZ9AB1TeeeRPySnbfbRxZuUWilTEjgDCqu1NpU3GGAOPPJ95S0NLzLz5IDKLjVfJJiePEqy0K4a3ySKnDBKWbQ2iTIBhBZKl61vecQFzftLtP21YkfhGAtNqbWc7ug4CUAoDqIRTHJayqpW3CBmx6MpPSRl0p6d71QWKhUR9OqqvT2gOaNp7SH2UFjp1FukNPaY5ountFvMIGDSsS99+3mFiDu9xUPNJNtvJafBerECO3pjGPuEPtNxB9FixB7auO6M6op/HxWLECm9pgtMgHPIKu39JoAgAZ5L1YgBqCGiEXajRYsQZfvOirm1HYK8WIKySvQsWIJGNW24OS8WINg1btasWIPd0L2mFixBut2LFiDYFYsWIP/2Q==';
      let shruggs = '¯\\_(ツ)_/¯';
      let color = ``;
      let colorHeader = ``;
      let spaces = '</br></br>';
      
      //If the event is the result of a taggable resource being deleted
      if (results.KillTime) {
         
         path.n += 'A';
         header = `Your ${results.ResourceType} has been deleted...</br>¯\\_(ツ)_/¯`;
         description = `Your ${results.ResourceType} "${results.ResourceName}" has been deleted and all its attachments have been remediated by AWS Automated Security.`;
         howToFixMessage = `Next time, please be sure to add the proper tags to your ${results.ResourceType} (${process.env.tag1} and ${process.env.tag2}).`;
         color = `style = 'color:red'`;
         
      //If the event is just the creation of a resource with incorrect tags
      } else if (!results.Response) {
         
         path.n += 'B';
         subject.Subject = 'You forgot your tags...¯\\_(ツ)_/¯';   
         let days = this.undoEpoch(this.createTTL(event));
         let s = 's';
         if (days == 1) {
            s = '';
         }
         header = 'Ahhhh Snap! You forgot your tags...</br>¯\\_(ツ)_/¯';
         description = `Your ${results.ResourceType} "${resourceName}" has been archived for deletion in ${days} day${s} by AWS Automated Security.`;

      //If a resource was deleted and cannot be recreated
      } else if (results.Response == 'Remediation could not be performed'){

         path.n += 'C';
         let id = resultsArray[4][1];
         img = '';
         if (resultsArray[4][0] == 'Response') {
            attachmentId = `resource`;
            id = resourceName; 
         }
         
         subject.Subject = `Improper Deletion`;
         colorHeader = `style="color:red"`;
         header = `${id} was deleted...`;
         description = `You have improperly deleted the ${attachmentId} "${resourceName}".`;
         howToFixMessage = `Next time, please remove through Serverless or TFS when deleting resources.`;
         spaces = `</br>`;
         shruggs = '';

      //If the event was the remediation of a creation of a new policy version
      } else if (results['Reset Default Version']){

         path.n += 'D';
         subject.Subject = `A default policy version has been reset. ${shruggs}`;
         colorHeader = `style = 'color:red'`;
         header = `The policy version ${results["Old Default Version"]} has been reset... ${shruggs}`;
         description = `The policy "${resourceName}" has been set to ${results['Reset Default Version']} by AWS Automated Security.`;
         howToFixMessage = `Next time, please deploy through Serverless or TFS when creating new policy versions.`;

      //Default notification  
      } else {

         path.n += 'E';
         subject.Subject = 'Your AWS stuff was remediated...¯\\_(ツ)_/¯';
         
         if (resultsArray[4][0] == 'Response') {
            attachmentId = 'resource';
         }

         description = `The ${attachmentId} ${resourceName} has been remediated by AWS Automated Security.`;
         if (results.Reason == 'Improper Launch') {
            howToFixMessage = `Next time, please deploy through Serverless or TFS when working in ${env} to prevent remediation`;
         }
         color = `style="color:red"`;
      }

      return `
      <html>
         <body style="width:100%">
            <div style="width:100%">
               <h1 ${colorHeader}>${header}</h1>
               <p ${color}>${description}</p>
               <p>${howToFixMessage}</p>
               <p>${spaces}${message}</p>
               <div style="text-align:center">
                  </br></br><a href = https://giphy.com/gifs/work-get-dad-2Zxe4ZB4i1yJW/fullscreen><img src=${img}></a>
               </div>
               <div style="text-align:center">
                  <font></br></br></br><b>Have a wonderful day!</b></font>
               </div>
               <div style="text-align:center">
                  <font>${shruggs}</font>
               </div>
            </div>
         </body>
      </html>`;
   }

   
   //**********************************************************************************************
   //Creates the HTML for an email to security depending on the event type and returns it
   /**/getHtmlSecurity(event, results){

      let env = process.env.environment;
      let message = this.structureMessage(results);
      let resultsArray = Object.entries(results);
      subject.Subject = `Someone forgot their tags in ${env}.`;
      let attachmentId = `attachment "${resultsArray[4][1]}" on`;
      let resourceName = resultsArray[3][1];
      let header = `AWS stuff was remediated in ${env}...</br>`;
      let description = '';
      let color = ``;
      let colorHeader = ``;
      let spaces = `</br>`;
      
      //If the event is the result of a taggable resource being deleted
      if (results.KillTime) {
         
         path.n += 'F';
         subject.Subject = `A ${results.ResourceType} was auto-deleted in ${env}`
         header = `A ${results.ResourceType} has been auto-deleted in ${env}...</br>`;
         description = `A ${results.ResourceType} "${results.ResourceName}" has been deleted and all its attachments have been remediated by AWS automated security.`;
         color = `style = 'color:red'`;
         
      //If the event is just the creation of a resource with incorrect tags
      } else if (!results.Response) {

         path.n += 'G';
         header = `A resource was created in ${env} without the proper tags.</br>`;
         let days = this.undoEpoch(this.createTTL(event));
         let s = 's';
         if (days == 1) {
            s = '';
         }
         description = `A ${results.ResourceType} "${resourceName}" has been archived for deletion in ${days} day${s} by AWS Automated Security. The correct tags need to be added to "${resourceName}" to prevent deletion (${process.env.tag1} and ${process.env.tag2}).`;
         spaces = '</br></br>';
         
      //If a resource was deleted and cannot be recreated
      } else if (results.Response == 'Remediation could not be performed'){

         path.n += 'H';
         let id = resultsArray[4][1];
         if (resultsArray[4][0] == 'Response') {
            attachmentId = `resource`;
            id = resourceName; 
         } 
         subject.Subject = `Improper Deletion in ${env}`;
         colorHeader = `style="color:red"`;
         header = `${id} was deleted through ${env} console...`;
         description = `The ${attachmentId} "${resourceName}" has been deleted by "${results['Entity Responsible']}" through ${env} console and could not be remediated by AWS Automated Security.`;

      //If the event was the remediation of a creation of a new policy version   
      } else if(results['Reset Default Version']){

         path.n += 'I';
         subject.Subject = `A default policy version has been auto-reset in ${env}.`;
         colorHeader = `style = 'color:red'`;
         header = `The policy version ${results["Old Default Version"]} was improperly set to default through ${env} console...`;
         description = `The policy "${resourceName}" has been set to ${results['Reset Default Version']} by AWS Automated Security.`;

      //Default notification
      } else {

         path.n += 'J';
         subject.Subject = `An AWS resource was remediated in ${env}.`;
         
         if (resultsArray[4][0] == 'Response') {
            attachmentId = 'resource';
         }
         description = `The ${attachmentId} "${resourceName}" has been remediated by AWS Automated Security.`;
         color = `style="color:red"`;
      }

      //returns the html template with the defined variables inside
      return `
      <html>
         <body style="width:100%">
            <div style="width:100%">
               <h1 ${colorHeader}>${header}</h1>
               <p ${color}>${description}</p>
               <p>${spaces}${message}${spaces}</p>
               <div style="text-align:center">
                  <a href = https://giphy.com/gifs/maury-maury-face-xT1XGWbE0XiBDX2T8Q/fullscreen>uuuhhh oooh....</a>
                  <font></br></br></br><b>Have a wonderful day!</b></font>
               </div>
            </div>
         </body>
      </html>`;
   };
   
   //**********************************************************************************************
   //Builds the results object
   /**/getResults(event, property) {
      
      return {
         Action: event.detail.eventName,
         Environment: process.env.environment,
         "Entity Responsible": this.getEntity(event),
         ...property
      };
   }


   //**********************************************************************************************
   //Returns a cloudwatch event given a dynamo event with specified requestParameters
   /**/TranslateDynamoToCloudwatchEvent(event, requestParameters){
      return {
         detail: {
            userIdentity: {
               principalId: `ASDFGHJAKKHGFG:${event.Records[0].dynamodb.OldImage['Entity Responsible'].S}`
            },
            eventName: '',
            requestParameters: {
               ...requestParameters
            }
         }
      }
   }
   
   
   //**********************************************************************************************
   //Sends an email to the user
   //notifyUser
   async notifyUser(event, results){

      const sender = `${process.env.sender}`;
      let recipient = '';
      let body_html = '';

      if (results['Entity Responsible'].includes('@') && event.Recusion == undefined) {
         recipient = results['Entity Responsible'];
         console.log("Sending to user! ~~~~~~~~~~~~~~~~~~");
         body_html = await this.getHtml(event, results);
         path.n += 'U'

         if(results.Response == "Remediation could not be performed"){
            event.Recusion = true;
            path.n += 'M';
            await this.notifyUser(event, results);
         }
      } else {
         path.n += 'S';
         console.log("Sending to security! ~~~~~~~~~~~~~~~~~~");
         recipient = `${process.env.internEmail1}`;
         body_html = await this.getHtmlSecurity(event, results);
      }
      var params = {
         Source: sender,
         Destination: {
            ToAddresses: [
            recipient
            ]
         },
         Message: {
            Subject: {
               Data: subject.Subject
            },
            Body: {
               Text: {
                  Data: ''
               },
               Html: {
                  Data: body_html
               }
            }
         }
      }
      await ses.sendEmail(params).promise();
      path.n += '^';
      console.log(`**************Message sent to ${recipient}**************\n\n`);
   };

   
   //**********************************************************************************************
   //Helper function that structures the email
   //structureMessage
   structureMessage(results) {

      //Reorders the results properties for the dynamo event to the baseline order so the email structures correctly.  
      if(results.KillTime) {
         results = {
            Action: results.Action,
            "Entity Responsible": results['Entity Responsible'],
            Environment: process.env.environment,
            ResourceName: results.ResourceName,
            ResourceType: results.ResourceType,
            Reason: results.Reason
         }
      }
      
      results = Object.entries(results);

      //converts the given results information into an html display
      const rows = results.map((pair) => { 
         return `<tr><td style="padding: 5px "><b>${pair[0]}:</b></td><td>${pair[1]}</td></tr>`;
      }).join('');
      
      let message = `
      <table style="width:100%"> 
         ${rows}
      </table>`;
            
      return message;
   };

   
   //**********************************************************************************************
   //functions that return whether or not the event is in the specific environment.
   /**/snd() {
      return process.env.environment == 'snd';
   }
   
   /**/dev(event) {
      let num = this.getNumber(event);
      return num == `${process.env.devNum1}` || num == `${process.env.devNum2}`;
   }
   
   /**/prd(event) {
      let num = this.getNumber(event);
      return num == `${process.env.prdNum1}` || num == `${process.env.prdNum2}`;
   }
   
   //gets the number that corresponds the the environment for the given event.
   /**/getNumber(event) {
      return  event.detail.userIdentity.accountId;
   }
   
   
   //**********************************************************************************************
   //Returns if the given resource is in the table or not.
   //checkTable
   async checkTable(ResourceName, ResourceType){
      console.log("Checking table for item.");
      let params = {
         Key: {
            "ResourceName": {
               S: ResourceName
            },
            "ResourceType":{
               S: ResourceType
            }
         },
         TableName: `remediation-db-table-${process.env.environment}-ShadowRealm`
      };
      let pulledItem = await dynamodb.getItem(params).promise();
      if(pulledItem.Item){
         console.log(`**************Found ${ResourceName} in the table, ending program**************`);
         return true;
      }
      console.log(`Did not find ${ResourceName}-------`);
      return false;
   }
   
   
   //**********************************************************************************************
   //Returns the amount of time before the item is deleted from the table depending on it's environment
   /**/createTTL(event) {
      if(this.snd()) {
         
         return this.getTime(.002);  //CHANGE TO 30 DAYS WHEN GUARD RAILS ARE OFF
         
      } else if(this.dev(event)) {
         
         return this.getTime(1);
      }
      
      return this.getTime(7);
   }
   
   //helper function that translates the current time into epoch based on days to wait
   /**/getTime(days) {
      let time = new Date().getTime() / 1000 + days * 86400;
      return time + '';
   }
   
   //returns the number of days that the given epoch time represents
   /**/undoEpoch(time) {
      let days = (time - new Date().getTime() / 1000) / 86400;
      return Math.ceil(days);
   }
   
   
   //**********************************************************************************************
   //checks if the given service has all the right tags, returns true if it does.
   /**/tagVerification(tags){
      
      //Stores only unique values for counting the tags
      let keySet = new Set();

      //Checks for the two required
      tags.forEach((object) => {
         const key = object.Key.trim();
         if (key == `${process.env.tag2}` || key == `${process.env.tag1}`) {
            keySet.add(key);
         }
      });

      if (keySet.size == 2) {
         path.n += '*';
         console.log('**************Tag verification succeeded, ending program**************');
         return true;
      }
      reason.Reason = 'Improper Tags';
      console.log('Required tags not found-----------------');
      path.n += '7';
      return false;
   }
   
   
   //**********************************************************************************************
   //Returns the required params for adding tags to the resource
   /**/getParamsForAddingTags(event, params, tagName) {
      
      let value = '';
      
      if (tagName == 'Environment') {
         value = process.env.environment;
      } else {
         value = this.getEntity(event);
      }
      
      return {
         Tags: [
         {
            Key: tagName,
            Value: value
         }
         ],
         ...params
      };
   }
   
   
   //**********************************************************************************************
   //checks if the the specified tag needs to be added. Returns true if it does.
   /**/needsTag(tags, tagName) {
      if (tags.find((object) => {
         return object.Key.trim() == tagName;
      }) == undefined) {
         console.log(`no ${tagName} found-------------`);
         return true;
      }
      console.log(`${tagName} found-----------`)
      return false;
   }
   
   
   //**********************************************************************************************
   //Adds the given resource to the dynamodb table
   //putItemInTable
   async putItemInTable(event, ResourceType, ResourceName) {

      //Checks to see if the resource is already in the table to prevent restarting the TTL and sending multiple emails
      if(await this.checkTable(ResourceName, ResourceType)) {
         path.n += '_';
         return;
      }
      
      //Builds the params to add to the dynamodb table
      var params = {
         TableName: `remediation-db-table-${process.env.environment}-ShadowRealm`,
         Item: {
            'Action': { S: event.detail.eventName },
            'ResourceType': { S: ResourceType },
            'ResourceName': { S: ResourceName },
            'Entity Responsible': { S: await this.getEntity(event) },
            'KillTime': { N: await this.createTTL(event) },
            'Reason': {S: reason.Reason}
         }
      }

      //Adds to dynamodb table with TTL
      console.log('Adding to table--------');
      await dynamodb.putItem(params).promise();
      path.n += '+';
      await this.notifyUser(event, await this.getResults(event, { ResourceName: ResourceName, ResourceType: ResourceType,  Reason: reason.Reason}));
   }
   
   
   //**********************************************************************************************
   //overrides the publish property/function of sns (only for jest testing)
   /**/setSns(value) {
      sns.publish = value;
   }
   
   //overrides the sendEmail property/function of ses (only for jest testing)
   /**/setSes(value) {
      ses.sendEmail = value;
   }

   //overrides the putItem property/function of dynamodb (only for jest testing)
   /**/setDynamo(value) {
      dynamodb.putItem = value;
   }
}

module.exports.path = path;
module.exports.stopper = stopper;
module.exports.dbStopper = dbStopper;
exports.handler = Master;

//Created by Matthew Hengl and Jocelyn Borovich. Ur fav 2019 interns!! :) :)
