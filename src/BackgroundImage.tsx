// @flow
import * as _ from "lodash";
import * as React from "react";
import {
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
            this.setState({ uri: path });
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
    const { preview, style, defaultSource, tint, children, ...otherProps } = this.props;
    const { uri } = this.state;
    const isImageReady = !!uri;
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
          <ImageBackground source={defaultSource} style={computedStyle} {...otherProps} >
            {children}
          </ImageBackground>
        )}
        {!!preview && (
          <ImageBackground source={preview} style={computedStyle} blurRadius={Platform.OS === "android" ? 0.5 : 0} {...otherProps} >
            {children}
          </ImageBackground>
        )
        }
        {isImageReady &&
          <ImageBackground source={{ uri }} style={computedStyle} {...otherProps}>
            {children}
          </ImageBackground>
        }
      </View>
    );
  }
}

const propsToCopy = [
  "borderRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius"
];
