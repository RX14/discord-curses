import {Map, List} from "immutable";
import {Server, ServerId, Channel, ChannelId, Message} from "./discord"

export enum LoginState {
    LOGGING_IN,
    LOGGED_IN,
    LOGIN_ERROR
}

export interface State {
    servers: Map<number, Server>
    channels: Map<number, Channel>
    serversChannelsRelation: Map<ServerId, List<ChannelId>>

    log: List<Message>

    currentChannelId: ChannelId
    collapsedServers: List<ServerId>

    screenHeight: number
    screenWidth: number

    corked: boolean
    channelListFocused: boolean
    loadingChannelLogs: boolean

    loginState: LoginState
    loginError: string
}
