export function errorHandler(err, req, res, next) {
    console.error('Error capturado:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    const statusCode = err.statusCode || 500;

    const errorResponse = {
        success: false,
        error: err.message || 'Error interno del servidor',
        path: req.path,
        timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
}

export default errorHandler;
