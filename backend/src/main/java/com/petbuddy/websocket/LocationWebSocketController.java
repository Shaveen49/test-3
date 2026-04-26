package com.petbuddy.websocket;

import com.petbuddy.dto.RideDto;
import com.petbuddy.service.RideService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import java.security.Principal;

@Controller
public class LocationWebSocketController {

    @Autowired
    private RideService rideService;

    @MessageMapping("/location.update")
    public void updateLocation(@Payload RideDto.LocationUpdate locationUpdate, Principal principal) {
        if (principal == null) {
            throw new RuntimeException("Authentication required for WebSocket");
        }
        // Allows updating location even if rideId is null (Driver is waiting for requests)
        rideService.updateDriverLocation(
                locationUpdate.getRideId(),
                locationUpdate.getLatitude(),
                locationUpdate.getLongitude(),
                principal.getName()
        );
    }
}