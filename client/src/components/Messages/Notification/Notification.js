import React from 'react';

import ScrollToBottom from 'react-scroll-to-bottom';

import Notification from './Notification/Notification';

import './Notifications.css';

const Notifications = ({ notifications, name }) => (
  <ScrollToBottom className="notifications">
    {notifications.map((notification, i) => <div key={i}><Notification notification={notification} name={name}/></div>)}
  </ScrollToBottom>
);

export default Notifications;