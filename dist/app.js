var c=(n,e,o)=>new Promise((r,a)=>{var i=t=>{try{m(o.next(t))}catch(d){a(d)}},s=t=>{try{m(o.throw(t))}catch(d){a(d)}},m=t=>t.done?r(t.value):Promise.resolve(t.value).then(i,s);m((o=o.apply(n,e)).next())});import{DynamoDB as b}from"@aws-sdk/client-dynamodb";import{Rekognition as l}from"@aws-sdk/client-rekognition";import{nanoid as y}from"nanoid";import{PrismaClient as p}from"@prisma/client";var k=new p;function u(o){return c(this,arguments,function*({bucketName:n,objectName:e}){let r=["Person","Knife","Gun","Weapon"];return new l().detectLabels({Image:{S3Object:{Bucket:n,Name:e}},MinConfidence:parseInt(process.env.REKOGNITION_MIN_CONFIDENCE||"80"),Settings:{GeneralLabels:{LabelInclusionFilters:r}}})})}function N(n){return c(this,null,function*(){return new b({region:"us-east-1"}).putItem({TableName:"livebus-dynamodb",Item:{id:{S:y()},payload:{S:JSON.stringify(n)},insertedAt:{S:new Date().toISOString()}}})})}var I=n=>c(void 0,null,function*(){var i,s;let e=(s=(i=n.Records)==null?void 0:i[0])==null?void 0:s.s3;if(!e)throw new Error("No object info");let{name:o}=e==null?void 0:e.bucket,{key:r}=e==null?void 0:e.object;if(!e)throw new Error("No object info");let a=yield u({bucketName:o,objectName:r});return N({deviceCode:"device-1",rekognitionPayload:a})});export{I as main};
