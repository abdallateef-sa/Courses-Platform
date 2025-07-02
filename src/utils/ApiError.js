//@desc    This class ApiError extends the built-in Error class to create custom, structured API errors with a message, status code, and a flag to indicate if the error is expected (operational).
class ApiError extends Error{
  constructor(message , statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith(4) ? 'fail' : 'error';
    this.isOperational =true;
    
  }
}

export default ApiError;