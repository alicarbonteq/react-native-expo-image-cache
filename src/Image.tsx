// @flow
import * as _ from "lodash";
import * as React from "react";
import {
  Image as RNImage,
  Animated,
  StyleSheet,
  View,
  Platform,
  ImageStyle,
  ImageURISource,
  ImageSourcePropType,
  StyleProp,
  ImageBackground
} from "react-native";
// import { BlurView } from "expo-blur";

import CacheManager, { DownloadOptions } from "./CacheManager";

interface ImageProps {
  style?: StyleProp<ImageStyle>;
  defaultSource?: ImageURISource | number;
  preview?: ImageSourcePropType;
  options?: DownloadOptions;
  uri: string;
  transitionDuration?: number;
  tint?: "dark" | "light";
  onError: (error: { nativeEvent: { error: Error } }) => void;
  bg?: boolean;
  onImageLoad: Function;
}

interface ImageState {
  uri: string | undefined;
  intensity: Animated.Value;
}

export default class Image extends React.Component<ImageProps, ImageState> {
  mounted = true;

  static defaultProps = {
    transitionDuration: 300,
    tint: "dark",
    onError: () => { }
  };

  state = {
    uri: undefined,
    intensity: new Animated.Value(100)
  };

  componentDidMount() {
    this.load(this.props);
  }

  componentDidUpdate(prevProps: ImageProps, prevState: ImageState) {
    const { preview, transitionDuration, uri: newURI } = this.props;
    const { uri, intensity } = this.state;
    if (newURI !== prevProps.uri) {
      this.load(this.props);
    } else if (uri && preview && prevState.uri === undefined) {
      Animated.timing(intensity, {
        duration: transitionDuration,
        toValue: 0,
        useNativeDriver: Platform.OS === "android"
      }).start();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  async load({ uri, options = {}, onError }: ImageProps): Promise<void> {
    if (uri) {
      try {
        const path = await CacheManager.get(uri, options).getPath();
        if (this.mounted) {
          if (path) {
            this.setState({ uri: path }, () => this.props.onImageLoad && this.props.onImageLoad());
          } else {
            onError({ nativeEvent: { error: new Error("Could not load image") } });
          }
        }
      } catch (error) {
        onError({ nativeEvent: { error } });
      }
    }
  }

  render() {
    const { preview, style, defaultSource, tint, bg = false, children, ...otherProps } = this.props;
    const { uri } = this.state;
    const isImageReady = !!uri;
    // const opacity = intensity.interpolate({
    //   inputRange: [0, 100],
    //   outputRange: [0, 0.5]
    // });
    const flattenedStyle = StyleSheet.flatten(style);
    const computedStyle: StyleProp<ImageStyle> = [
      StyleSheet.absoluteFill,
      _.transform(_.pickBy(flattenedStyle, (_val, key) => propsToCopy.indexOf(key) !== -1), (result, value: any, key) =>
        Object.assign(result, { [key]: value - (flattenedStyle.borderWidth || 0) })
      )
    ];
    return (
      <View {...{ style }}>
        {!!defaultSource && !isImageReady && (
          bg ?
            <ImageBackground source={defaultSource} style={computedStyle} {...otherProps} >
              {children}
            </ImageBackground>
            :
            <RNImage source={defaultSource} style={computedStyle} {...otherProps} />
        )}
        {!!preview && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <RNImage source={preview} style={{ resizeMode: "contain", width: 30, height: 30 }} blurRadius={Platform.OS === "android" ? 0.5 : 0} {...otherProps} />
          </View>
        )}
        {isImageReady &&
          (bg ?
            <ImageBackground source={{ uri }} style={computedStyle} {...otherProps}>
              {children}
            </ImageBackground>
            :
            <RNImage source={{ uri }} style={computedStyle} {...otherProps} />)
        }
        {/* {!!preview && Platform.OS === "ios" && <AnimatedBlurView style={computedStyle} {...{ intensity, tint }} />}
        {!!preview && Platform.OS === "android" && <Animated.View style={[computedStyle, { opacity }]} />} */}
      </View>
    );
  }
}

// const black = "black";
// const white = "white";
const propsToCopy = [
  "borderRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius"
];
// const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
