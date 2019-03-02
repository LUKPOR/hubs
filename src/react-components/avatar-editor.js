import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { getReticulumFetchUrl } from "../utils/phoenix-utils";
import { upload } from "../utils/media-utils";
import classNames from "classnames";

import styles from "../assets/stylesheets/profile.scss";

const BOT_PARENT_AVATAR = "muKnhtJ";

export default class AvatarEditor extends Component {
  static propTypes = {
    store: PropTypes.object,
    onSignIn: PropTypes.func,
    onSignOut: PropTypes.func,
    signedIn: PropTypes.bool,
    advanced: PropTypes.bool,
    onAvatarChanged: PropTypes.func,
    saveStateAndFinish: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {};
    // this.state = { avatar: { name: "Base bot avatar", files: {} } };

    this.inputFiles = {
      glb: undefined,

      base_map: undefined,
      emissive_map: undefined,
      normal_map: undefined,

      ao_map: undefined,
      metalic_map: undefined,
      roughness_map: undefined,

      orm_map: undefined
    };
  }

  componentDidMount = () => {
    if (this.props.signedIn && !this.state.avatar) {
      return this.getPersonalAvatar();
    }
  };

  componentDidUpdate = () => {
    if (this.props.signedIn && !this.state.avatar) {
      return this.getPersonalAvatar();
    }
  };

  getPersonalAvatar = async () => {
    const { personalAvatarId } = this.props.store.state.profile;
    const avatar = await (personalAvatarId
      ? this.getAvatar(personalAvatarId)
      : this.createOrUpdateAvatar({ name: "My Avatar", parent_avatar_id: BOT_PARENT_AVATAR }));

    this.props.store.update({
      profile: {
        personalAvatarId: avatar.avatar_id
      }
    });

    this.props.onAvatarChanged(avatar.avatar_id);

    this.setState({ ...this.state, avatar });
  };

  getAvatar = avatarId =>
    fetch(getReticulumFetchUrl(`/api/v1/avatars/${avatarId}`), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `bearer ${this.props.store.state.credentials.token}`
      }
    })
      .then(r => r.json())
      .then(({ avatars }) => avatars[0]);

  createOrUpdateAvatar = avatar =>
    fetch(getReticulumFetchUrl(avatar.avatar_id ? `/api/v1/avatars/${avatar.avatar_id}` : "/api/v1/avatars"), {
      method: avatar.avatar_id ? "PUT" : "POST",
      body: JSON.stringify({ avatar }),
      headers: {
        "Content-Type": "application/json",
        authorization: `bearer ${this.props.store.state.credentials.token}`
      }
    })
      .then(r => r.json())
      .then(({ avatars }) => avatars[0]);

  uploadAvatar = async e => {
    e.preventDefault();

    if (this.inputFiles.glb) {
      const gltfLoader = new THREE.GLTFLoader();
      const gltfUrl = URL.createObjectURL(this.inputFiles.glb);
      const onProgress = console.log;
      const parser = await new Promise((resolve, reject) =>
        gltfLoader.createParser(gltfUrl, resolve, onProgress, reject)
      );
      URL.revokeObjectURL(gltfUrl);

      const { content, body } = parser.extensions.KHR_binary_glTF;
      this.inputFiles.gltf = new File([content], "file.gltf", {
        type: "model/gltf"
      });
      this.inputFiles.bin = new File([body], "file.bin", {
        type: "application/octet-stream"
      });
    }

    const filesToUpload = ["gltf", "bin", "base_map", "emissive_map", "normal_map", "orm_map"].filter(
      k => !!this.inputFiles[k]
    );

    this.setState({ uploading: true });

    const fileUploads = await Promise.all(filesToUpload.map(f => this.inputFiles[f] && upload(this.inputFiles[f])));
    const avatar = {
      ...this.state.avatar,
      files: fileUploads
        .map((resp, i) => [filesToUpload[i], [resp.file_id, resp.meta.access_token, resp.meta.promotion_token]])
        .reduce((o, [k, v]) => ({ ...o, [k]: v }), {})
    };

    await this.createOrUpdateAvatar(avatar);

    this.props.onAvatarChanged(avatar.avatar_id);

    this.setState({ uploading: false });
    this.props.saveStateAndFinish();
  };

  fileField = (name, label, accept, disabled = false, title) => (
    <div className={styles.fileInputRow} key={name} title={title}>
      <label htmlFor={`avatar-file_${name}`}>
        <div className="img-box">{this.state.avatar.files[name] && <img src={this.state.avatar.files[name]} />}</div>
        <span>{label}</span>
      </label>
      <input
        id={`avatar-file_${name}`}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={e => {
          this.inputFiles[name] = e.target.files[0];
          URL.revokeObjectURL(this.state.avatar.files[name]);
          this.setState({
            avatar: {
              ...this.state.avatar,
              files: {
                ...this.state.avatar.files,
                [name]: URL.createObjectURL(e.target.files[0])
              }
            }
          });
        }}
      />
    </div>
  );

  textField = (name, label, disabled) => (
    <div>
      <label htmlFor={`#avatar-${name}`}>{label}</label>
      <input
        id={`avatar-${name}`}
        type="text"
        disabled={disabled}
        value={this.state.avatar[name]}
        onChange={e => this.setState({ avatar: { ...this.state.avatar, [name]: e.target.value } })}
      />
    </div>
  );

  checkbox = (name, label, disabled) => (
    <div>
      <label htmlFor={`#avatar-${name}`}>{label}</label>
      <input
        id={`avatar-${name}`}
        type="checkbox"
        disabled={disabled}
        value={this.state.avatar[name]}
        onChange={e => this.setState({ avatar: { ...this.state.avatar, [name]: e.target.value } })}
      />
    </div>
  );

  render() {
    if (!this.props.signedIn) {
      return (
        <a onClick={this.props.onSignIn}>
          <FormattedMessage id="sign-in.in" />
        </a>
      );
    }

    if (!this.state.avatar) {
      return <div>Loading...</div>;
    }

    const { advanced } = this.props;

    return (
      <div className={classNames(styles.avatarSelectorContainer, "avatar-editor")}>
        <div className="form-body">
          {advanced && this.textField("avatar_id", "Avatar ID", true)}
          {advanced && this.textField("parent_avatar_id", "Parent Avatar ID")}
          {advanced && this.textField("name", "Name")}
          {advanced && this.textField("description", "Description")}
          {advanced && this.checkbox("allow_remixing", "Allow Remixing")}
          {advanced && this.checkbox("allow_promotion", "Allow Promotion")}
          {advanced && this.fileField("glb", "Avatar GLB", "model/gltf+binary,.glb")}

          {this.fileField("base_map", "Base Map", "image/*")}
          {this.fileField("emissive_map", "Emissive Map", "image/*")}
          {this.fileField("normal_map", "Normal Map", "image/*")}

          {this.fileField("orm_map", "ORM Map", "image/*", false, "Occlussion (r), Roughness (g), Metallic (b)")}

          {/* {this.fileField("ao_map", "AO Map", "images/\*", true)} */}
          {/* {this.fileField("metallic_map", "Metallic Map", "image/\*", true)} */}
          {/* {this.fileField("roughness_map", "Roughness Map", "image/\*", true)} */}

          <div className={styles.info}>
            Resources for creating custom avatar skins can be found
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/j-conrad/hubs-avatar-pipelines">
              here
            </a>
          </div>
        </div>
        <div>
          <input
            disabled={this.state.uploading}
            onClick={this.uploadAvatar}
            className={styles.formSubmit}
            type="submit"
            value={this.state.uploading ? "Uploading..." : "Accept"}
          />
        </div>
      </div>
    );
  }
}
