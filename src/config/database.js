import mongoose from "mongoose";

const dbConnection = () => {
  mongoose
    .connect(process.env.DB_URL)
    .then((conn) => {
      console.log(`Database: ${conn.connection.host}`);
    })

};

export default dbConnection;