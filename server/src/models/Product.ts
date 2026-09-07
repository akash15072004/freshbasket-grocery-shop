import mongoose,{Schema} from "mongoose";
export interface IProduct {name:string;brand:string;category:string;description:string;image:string;mrp:number;sellingPrice:number;unit:string;stock:number;lowStockThreshold:number;isActive:boolean;rating:number;}
const schema=new Schema<IProduct>({name:{type:String,required:true},brand:String,category:String,description:String,image:String,mrp:Number,sellingPrice:Number,unit:String,stock:Number,lowStockThreshold:{type:Number,default:5},isActive:{type:Boolean,default:true},rating:{type:Number,default:4.5}},{timestamps:true});
schema.index({name:"text",brand:"text",category:"text"});
export default mongoose.model<IProduct>("Product",schema);