import mongoose from "mongoose";

export default async function connectDB () {
  try {
    const dbConnection =  await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)
    console.log('Database Connected, DB HOST', dbConnection.connection.host)
  } catch (error) {
    console.log("Databse Connection Error", error)
      process.exit(1)
  }
}