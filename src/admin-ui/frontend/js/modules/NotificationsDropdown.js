(function(w){

    class NotificationDropdown{

        constructor(){

        }


        render( configuration ){
            return `<!--Security message-->
                        <div class="tab-pane fade show active" id="tab-default" role="tabpanel">
                            <div class="d-flex h-100">
                                <div class="px-4 d-flex flex-column align-items-center justify-content-center">
                                    <svg class="sa-icon sa-icon-5x sa-icon-primary">
                                        <use href="img/sprite.svg#arrow-up-circle"></use>
                                    </svg>
                                    <span class="text-center fw-300" style="font-size: 1.25rem;"> Select a tab above </span>
                                    <div class="mb-0 py-3 text-center fs-md fw-300 text-muted"> This blank page helps protect your privacy. To change this default message, <a href="#">update your settings</a>. </div>
                                </div>
                            </div>
                        </div>
                        <!-- Messages -->
                        <div class="tab-pane fade" id="tab-messages" role="tabpanel">
                            <div class="custom-scroll h-100">
                                <ul class="notification">
                                    <li class="unread alert alert-dismissable">
                                        <div class="d-flex align-items-center">
                                            <span class="status me-2">
                                                <span class="profile-image rounded-circle d-inline-block" style="background-image:url('img/avatar-c.png')"></span>
                                            </span>
                                            <span class="d-flex flex-column flex-1 ms-1">
                                                <!-- <span class="name">Melissa Ayre <span class="badge bg-primary fw-n position-absolute top-0 end-0 mt-1">INBOX</span></span> -->
                                                <span class="name">Melissa Ayre</span>
                                                <span class="msg-a fs-sm">Re: New security codes</span>
                                                <span class="msg-b fs-xs">Hello again and thanks for being part...</span>
                                                <span class="fs-nano text-muted mt-1">56 seconds ago</span>
                                            </span>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="unread alert alert-dismissable">
                                        <div class="d-flex align-items-center">
                                            <span class="status me-2">
                                                <span class="profile-image rounded-circle d-inline-block" style="background-image:url('img/avatar-a.png')"></span>
                                            </span>
                                            <span class="d-flex flex-column flex-1 ms-1">
                                                <span class="name">Adison Lee</span>
                                                <span class="msg-a fs-sm">Msed quia non numquam eius</span>
                                                <span class="fs-nano text-muted mt-1">2 minutes ago</span>
                                            </span>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center">
                                            <span class="status status-success me-2">
                                                <span class="profile-image rounded-circle d-inline-block" style="background-image:url('img/avatar-b.png')"></span>
                                            </span>
                                            <span class="d-flex flex-column flex-1 ms-1">
                                                <span class="name">Oliver Kopyuv</span>
                                                <span class="msg-a fs-sm">Msed quia non numquam eius</span>
                                                <span class="fs-nano text-muted mt-1">3 days ago</span>
                                            </span>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center">
                                            <span class="status status-warning me-2">
                                                <span class="profile-image rounded-circle d-inline-block" style="background-image:url('img/avatar-e.png')"></span>
                                            </span>
                                            <span class="d-flex flex-column flex-1 ms-1">
                                                <span class="name">Dr. John Cook PhD</span>
                                                <span class="msg-a fs-sm">Msed quia non numquam eius</span>
                                                <span class="fs-nano text-muted mt-1">2 weeks ago</span>
                                            </span>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center">
                                            <span class="status status-success me-2">
                                                <span class="profile-image rounded-circle d-inline-block" style="background-image:url('img/avatar-h.png')"></span>
                                            </span>
                                            <span class="d-flex flex-column flex-1 ms-1">
                                                <span class="name">Sarah McBrook</span>
                                                <span class="msg-a fs-sm">Msed quia non numquam eius</span>
                                                <span class="fs-nano text-muted mt-1">3 weeks ago</span>
                                            </span>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center">
                                            <span class="status status-success me-2">
                                                <span class="profile-image rounded-circle d-inline-block" style="background-image:url('img/avatar-m.png')"></span>
                                            </span>
                                            <span class="d-flex flex-column flex-1 ms-1">
                                                <span class="name">Anothony Bezyeth</span>
                                                <span class="msg-a fs-sm">Msed quia non numquam eius</span>
                                                <span class="fs-nano text-muted mt-1">one month ago</span>
                                            </span>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center">
                                            <span class="status status-danger me-2">
                                                <span class="profile-image rounded-circle d-inline-block" style="background-image:url('img/avatar-j.png')"></span>
                                            </span>
                                            <span class="d-flex flex-column flex-1 ms-1">
                                                <span class="name">Lisa Hatchensen</span>
                                                <span class="msg-a fs-sm">Msed quia non numquam eius</span>
                                                <span class="fs-nano text-muted mt-1">one year ago</span>
                                            </span>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                </ul>
                                <div class="notification-empty-msg">
                                    <i style="color: white" class="ti ti-coffee></i>
                                    <span> No new messages </span>
                                </div>
                            </div>
                        </div>
                        <!-- Feeds -->
                        <div class="tab-pane fade" id="tab-feeds" role="tabpanel">
                            <div class="custom-scroll h-100">
                                <ul class="notification">
                                    <li class="unread alert alert-dismissable">
                                        <div class="d-flex align-items-center show-child-on-hover">
                                            <span class="d-flex flex-column flex-1">
                                                <span class="name d-flex align-items-center">Administrator <span class="badge bg-success fw-n ms-1">UPDATE</span></span>
                                                <span class="msg-a fs-sm"> System updated to version <strong>4.6.0</strong> <a href="docs_buildnotes.html">(patch notes)</a>
                                                </span>
                                                <span class="fs-nano text-muted mt-1">5 mins ago</span>
                                            </span>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center show-child-on-hover">
                                            <div class="d-flex flex-column flex-1">
                                                <span class="name"> Adison Lee <span class="fw-300 d-inline">replied to your video <a href="#" class="fw-400"> Cancer Drug</a> </span>
                                                </span>
                                                <span class="msg-a fs-sm mt-2">Bring to the table win-win survival strategies to ensure proactive domination. At the end of the day...</span>
                                                <span class="fs-nano text-muted mt-1">10 minutes ago</span>
                                            </div>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center show-child-on-hover">
                                            <div class="d-flex flex-column flex-1">
                                                <span class="name"> Troy Norman'<span class="fw-300">s new connections</span>
                                                </span>
                                                <div class="fs-sm d-flex align-items-center mt-2">
                                                    <span class="profile-image-md ms-1 rounded-circle d-inline-block" style="background-image:url('img/avatar-a.png'); background-size: cover;"></span>
                                                    <span class="profile-image-md ms-1 rounded-circle d-inline-block" style="background-image:url('img/avatar-b.png'); background-size: cover;"></span>
                                                    <span class="profile-image-md ms-1 rounded-circle d-inline-block" style="background-image:url('img/avatar-c.png'); background-size: cover;"></span>
                                                    <span class="profile-image-md ms-1 rounded-circle d-inline-block" style="background-image:url('img/avatar-e.png'); background-size: cover;"></span>
                                                    <div data-hasmore="+3" class="rounded-circle profile-image-md ms-1">
                                                        <span class="profile-image-md ms-1 rounded-circle d-inline-block" style="background-image:url('img/avatar-h.png'); background-size: cover;"></span>
                                                    </div>
                                                </div>
                                                <span class="fs-nano text-muted mt-1">55 minutes ago</span>
                                            </div>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center show-child-on-hover">
                                            <div class="d-flex flex-column flex-1">
                                                <span class="name">Dr John Cook <span class="fw-300">sent a <span class="text-danger">new signal</span></span></span>
                                                <span class="msg-a fs-sm mt-2">Nanotechnology immersion along the information highway will close the loop on focusing solely on the bottom line.</span>
                                                <span class="fs-nano text-muted mt-1">10 minutes ago</span>
                                            </div>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center show-child-on-hover">
                                            <div class="d-flex flex-column flex-1">
                                                <span class="name">Lab Images <span class="fw-300">were updated!</span></span>
                                                <div class="fs-sm d-flex align-items-center mt-1">
                                                    <a href="#" class="ms-1 mt-1" title="Cell A-0012">
                                                        <span class="d-block img-share" style="background-image:url('img/pic-7.png'); background-size: cover;"></span>
                                                    </a>
                                                    <a href="#" class="ms-1 mt-1" title="Patient A-473 saliva">
                                                        <span class="d-block img-share" style="background-image:url('img/pic-8.png'); background-size: cover;"></span>
                                                    </a>
                                                    <a href="#" class="ms-1 mt-1" title="Patient A-473 blood cells">
                                                        <span class="d-block img-share" style="background-image:url('img/pic-11.png'); background-size: cover;"></span>
                                                    </a>
                                                    <a href="#" class="ms-1 mt-1" title="Patient A-473 Membrane O.C">
                                                        <span class="d-block img-share" style="background-image:url('img/pic-12.png'); background-size: cover;"></span>
                                                    </a>
                                                </div>
                                                <span class="fs-nano text-muted mt-1">55 minutes ago</span>
                                            </div>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                    <li class="alert alert-dismissable">
                                        <div class="d-flex align-items-center show-child-on-hover">
                                            <div class="d-flex flex-column flex-1 w-100">
                                                <div class="name mb-2"> Lisa Lamar<span class="fw-300"> updated project</span>
                                                </div>
                                                <div class="row fs-b fw-300">
                                                    <div class="col text-start"> Progress </div>
                                                    <div class="col text-end fw-500"> 45% </div>
                                                </div>
                                                <div class="progress progress-sm d-flex mt-1">
                                                    <span class="progress-bar bg-primary progress-bar-striped" role="progressbar" style="width: 45%" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100"></span>
                                                </div>
                                                <span class="fs-nano text-muted mt-1">2 hrs ago</span>
                                            </div>
                                        </div>
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </li>
                                </ul>
                                <div class="notification-empty-msg">
                                    <svg class="sa-icon sa-icon-5x sa-icon-primary">
                                        <use href="img/sprite.svg#smile"></use>
                                    </svg>
                                    <span> You are all set! </span>
                                </div>
                            </div>
                        </div>
                        <!-- Events -->
                        <div class="tab-pane fade" id="tab-events" role="tabpanel">
                            <div class="d-flex flex-column h-100">
                                <div class="h-auto">
                                    <table class="table-calendar m-0 w-100 h-100 border-0">
                                        <tr>
                                            <th colspan="7" class="pt-3 pb-2 px-3 text-center">
                                                <div class="js-get-date h6 fw-600 mb-2">Fake Day, October 15th, 2090</div>
                                            </th>
                                        </tr>
                                        <tr class="text-center">
                                            <th>Sun</th>
                                            <th>Mon</th>
                                            <th>Tue</th>
                                            <th>Wed</th>
                                            <th>Thu</th>
                                            <th>Fri</th>
                                            <th>Sat</th>
                                        </tr>
                                        <tr>
                                            <td class="text-muted bg-faded">30</td>
                                            <td>1</td>
                                            <td>2</td>
                                            <td>3</td>
                                            <td>4</td>
                                            <td>5</td>
                                            <td>
                                                <svg class="sa-icon sa-icon-warning m-1 position-absolute pos-left pos-top" style="--sa-icon-size: 0.85rem; --sa-fill-opacity: 0.5;">
                                                    <use href="img/sprite.svg#star"></use>
                                                </svg> 6
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>7</td>
                                            <td>8</td>
                                            <td>9</td>
                                            <td class="bg-primary-600 text-white pattern-0">10</td>
                                            <td>11</td>
                                            <td>12</td>
                                            <td>13</td>
                                        </tr>
                                        <tr>
                                            <td>14</td>
                                            <td>15</td>
                                            <td>16</td>
                                            <td>17</td>
                                            <td>18</td>
                                            <td>19</td>
                                            <td>20</td>
                                        </tr>
                                        <tr>
                                            <td>21</td>
                                            <td>
                                                <svg class="sa-icon sa-icon-info m-1 position-absolute pos-left pos-top" style="--sa-icon-size: 0.85rem; --sa-fill-opacity: 0.5;">
                                                    <use href="img/sprite.svg#shield"></use>
                                                </svg> 22
                                            </td>
                                            <td>23</td>
                                            <td>24</td>
                                            <td>25</td>
                                            <td>26</td>
                                            <td>27</td>
                                        </tr>
                                        <tr>
                                            <td>28</td>
                                            <td>29</td>
                                            <td>30</td>
                                            <td>31</td>
                                            <td class="text-muted bg-faded">1</td>
                                            <td class="text-muted bg-faded">2</td>
                                            <td class="text-muted bg-faded">3</td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="flex-1 custom-scroll shadow-inset-3">
                                    <div class="p-2">
                                        <div class="d-flex align-items-center text-left mb-3">
                                            <div class="width-5 text-primary align-self-start table-calendar-appointment-date fw-300 text-center"> 15 </div>
                                            <div class="flex-1">
                                                <div class="d-flex flex-column">
                                                    <span class="l-h-n fs-md fw-500"> October 2020 </span>
                                                    <span class="l-h-n fs-nano fw-400 text-secondary"> Monday </span>
                                                </div>
                                                <div class="d-flex flex-column gap-2 mt-2">
                                                    <div>
                                                        <strong>2:30PM</strong> - Doctor's appointment
                                                    </div>
                                                    <div>
                                                        <strong>3:30PM</strong> - Report overview
                                                    </div>
                                                    <div>
                                                        <strong>4:30PM</strong> - Meeting with Donnah V.
                                                    </div>
                                                    <div>
                                                        <strong>5:30PM</strong> - Late Lunch
                                                    </div>
                                                    <div>
                                                        <strong>6:30PM</strong> - Report Compression
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>`
        }


    }

    if(w.Layout) w.Layout.setModule( 'NotificationDropdown', new NotificationDropdown() )



})(window)