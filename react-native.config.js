module.exports = {
  dependency: {
    platforms: {
      ios: null,
      android: {
        sourceDir: './android',
        packageImportPath:
          'import com.margelo.nitro.samsungpayreactnative.SamsungPayReactNativePackage;',
        packageInstance: 'new SamsungPayReactNativePackage()',
      },
    },
  },
};
