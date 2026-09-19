import mongoose, { Schema } from "mongoose";
const schema = new Schema({
 incentiveId:{type:String,required:true,unique:true,index:true}, deliveryPartner:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true}, periodStart:{type:Date,default:null}, periodEnd:{type:Date,default:null}, completedDeliveries:{type:Number,default:0}, averageRating:{type:Number,default:0}, eligibleAmount:{type:Number,default:0,min:0}, approvedAmount:{type:Number,default:0,min:0}, status:{type:String,enum:["PENDING","APPROVED","PROCESSING","PAID","REJECTED","ON_HOLD"],default:"PENDING",index:true}, approvedBy:{type:Schema.Types.ObjectId,ref:"User",default:null}, paidAt:{type:Date,default:null}, notes:{type:String,default:"",maxlength:2000}
},{timestamps:true});
schema.index({deliveryPartner:1,createdAt:-1});
export default mongoose.models.Incentive || mongoose.model("Incentive",schema);
