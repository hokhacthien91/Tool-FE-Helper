'use strict';

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TSConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { getThemeConfig } = require('./webpack.theme.config');

const SOURCE_ROOT = __dirname + '/src/main/webpack';

const resolve = {
    extensions: ['.js', '.ts', '.tsx', '.d.ts', '.jsx', '.scss', '.css'],
    plugins: [new TSConfigPathsPlugin({
        configFile: './tsconfig.json'
    })]
};

// CSS-only webpack config
module.exports = (env = {}) => {
    const theme = env.theme || 'mg-investments';
    const themeConfig = getThemeConfig(theme);

    // Use SCSS entry points instead of TS
    const entryKey = `site-${theme}`;
    let entryFile;

    if (theme === 'rte') {
        // RTE theme uses different path structure
        entryFile = SOURCE_ROOT + `/${themeConfig.entry.replace('.js', '.scss')}`;
    } else {
        // themeConfig.entry already includes theme path (e.g., 'mg-investments/main-mg-investments.ts')
        entryFile = SOURCE_ROOT + `/site/${themeConfig.entry.replace('.ts', '.scss')}`;
    }

    const printEntryKey = `site-${theme}-print`;
    const printEntryFile = SOURCE_ROOT + `/site/${theme}/main-${theme}-print.scss`;

    const entry = {
        [entryKey]: entryFile,
    };

    if (theme !== 'rte') {
        entry[printEntryKey] = printEntryFile;
    }

    return {
        mode: 'production',
        entry,
        output: {
            // No JS output needed for CSS-only build
            path: path.resolve(__dirname, 'dist'),
            clean: false // Don't clean, let CleanWebpackPlugin handle it
        },
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                url: false,
                                sourceMap: false
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [
                                        require('autoprefixer')
                                    ]
                                },
                                sourceMap: false
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: false
                            }
                        },
                        {
                            loader: 'glob-import-loader',
                            options: {
                                resolve: resolve
                            }
                        }
                    ]
                },
                // Ignore other file types (images, fonts, etc.)
                {
                    test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|svg)(\?.*)?$/,
                    type: 'asset/resource',
                    generator: {
                        emit: false // Don't emit files, just resolve them
                    }
                }
            ]
        },
        plugins: [
            new CleanWebpackPlugin({
                cleanOnceBeforeBuildPatterns: [
                    `${themeConfig.output}/css/**/*`
                ]
            }),
            new MiniCssExtractPlugin({
                filename: (pathData) => {
                    if (pathData.chunk.name && pathData.chunk.name.endsWith('-print')) {
                        return `${themeConfig.output}/css/[name].css`;
                    }
                    return `${themeConfig.output}/css/[name].css`;
                }
            }),
            new CopyWebpackPlugin({
                patterns: (() => {
                    const patterns = [];
                    if (theme !== 'rte') {
                        const resourcesPath = `./${themeConfig.output}/resources`;
                        patterns.push({
                            from: path.resolve(__dirname, SOURCE_ROOT + `/resources`),
                            to: resourcesPath
                        });
                        patterns.push({
                            from: path.resolve(__dirname, SOURCE_ROOT + `/resources/icons/${theme}`),
                            to: resourcesPath
                        });
                    }
                    return patterns;
                })()
            })
        ],
        optimization: {
            minimize: true,
            minimizer: [
                new CssMinimizerPlugin({
                    minimizerOptions: {
                        preset: ['default', {
                            calc: true,
                            convertValues: true,
                            discardComments: {
                                removeAll: true
                            },
                            discardDuplicates: true,
                            discardEmpty: true,
                            mergeRules: true,
                            normalizeCharset: true,
                            reduceInitial: true,
                            svgo: {
                                plugins: [
                                    {
                                        name: 'preset-default',
                                        params: {
                                            overrides: {
                                                removeViewBox: false,
                                            }
                                        }
                                    }
                                ]
                            }
                        }],
                    }
                })
            ]
        },
        resolve: resolve,
        stats: {
            assetsSort: 'chunks',
            builtAt: true,
            children: false,
            chunkGroups: true,
            chunkOrigins: true,
            colors: false,
            errors: true,
            errorDetails: true,
            env: true,
            modules: false,
            performance: true,
            providedExports: false,
            source: false,
            warnings: true
        }
    };
};

