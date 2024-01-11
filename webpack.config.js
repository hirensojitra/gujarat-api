module.exports = {
    externals: {
        express: "commonjs express",
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.m?js$/,
                include: /node_modules\/(mysql2|lru-cache)/,
                use: {
                    loader: "raw-loader",
                },
            },
            {
                test: /\.css$/,
                use: ['css-loader']
            },
            {
                test: /mock-aws-s3/,
                loader: 'null-loader', // Exclude mock-aws-s3 from compilation
            }
        ],
    },
};