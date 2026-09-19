import mongoose, { Schema } from "mongoose";
const schema = new Schema({
 batchId:{type:String,required:true,unique:true,index:true}, orders:[{type:Schema.Types.ObjectId,ref:"Order"}], incentives:[{type:Schema.Types.ObjectId,ref:"Incentive"}], partners:[{type:Schema.Types.ObjectId,ref:"User"}], total:{type:Number,default:0,min:0}, status:{type:String,enum:["CREATED","UNDER_REVIEW","APPROVED","PROCESSING","PAID","FAILED"],default:"CREATED",index:true}, createdBy:{type:Schema.Types.ObjectId,ref:"User",required:true}, processedBy:{type:Schema.Types.ObjectId,ref:"User",default:null}, processedAt:{type:Date,default:null}, transactionReference:{type:String,default:""}, notes:{type:String,default:"",maxlength:2000}
},{timestamps:true});
export default mongoose.models.PayoutBatch || mongoose.model("PayoutBatch",schema);
