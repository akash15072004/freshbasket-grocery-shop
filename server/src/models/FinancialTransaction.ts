import mongoose, { Schema } from "mongoose";
const schema = new Schema({
 transactionId:{type:String,required:true,unique:true,index:true}, type:{type:String,enum:["REFUND","DELIVERY_PAYOUT","INCENTIVE","ADJUSTMENT"],required:true,index:true}, referenceId:{type:String,required:true,index:true}, order:{type:Schema.Types.ObjectId,ref:"Order",default:null,index:true}, customer:{type:Schema.Types.ObjectId,ref:"User",default:null,index:true}, deliveryPartner:{type:Schema.Types.ObjectId,ref:"User",default:null,index:true}, amount:{type:Number,required:true,min:0}, direction:{type:String,enum:["OUTFLOW","INFLOW"],required:true}, paymentMethod:{type:String,default:""}, status:{type:String,required:true,index:true}, notes:{type:String,default:"",maxlength:2000}, createdAt:{type:Date,default:Date.now}, completedAt:{type:Date,default:null}, createdBy:{type:Schema.Types.ObjectId,ref:"User",default:null}, metadata:{type:Schema.Types.Mixed,default:{}}
},{timestamps:false});
schema.index({type:1,createdAt:-1}); schema.index({status:1,createdAt:-1});
export default mongoose.models.FinancialTransaction || mongoose.model("FinancialTransaction",schema);
